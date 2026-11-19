using Microsoft.EntityFrameworkCore;

namespace ChelseaXP.Api.Complaints;

public static class ComplaintReviewEndpoints
{
    public static void MapComplaintReview(this WebApplication app, bool databaseConfigured)
    {
        var review = app.MapGroup("/api/complaints/review")
            .RequireAuthorization("ComplaintReviewer")
            .AddEndpointFilter(async (context, next) =>
            {
                context.HttpContext.Response.Headers.CacheControl = "no-store";
                if (!databaseConfigured)
                    return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
                return await next(context);
            });

        review.MapGet("/inbox", async (ComplaintDb db, long? beforeId, CancellationToken ct) =>
        {
            var complaints = db.Complaints.AsNoTracking();
            if (beforeId is { } id)
                complaints = complaints.Where(row => row.Id < id);

            return await complaints.OrderByDescending(row => row.Id).Take(50)
                .Select(row => new { row.Id, row.Subject, row.SubmittedAt, row.PublishedAt })
                .ToListAsync(ct);
        });

        review.MapGet("/{id:long}", async (long id, HttpContext context, ComplaintReviewOwner owner, ComplaintDb db, CancellationToken ct) =>
        {
            var complaint = await db.Complaints.AsNoTracking().SingleOrDefaultAsync(row => row.Id == id, ct);
            return complaint is null ? Results.NotFound() : Results.Ok(ComplaintReviewDetail.From(complaint, owner.IsAdmin(context.User)));
        });

        review.MapPost("/{id:long}/draft", async (long id, ComplaintReviewWrite draft, ComplaintDb db, CancellationToken ct) =>
        {
            var complaint = await db.Complaints.FindAsync([id], ct);
            if (complaint is null) return Results.NotFound();
            if (complaint.PublishedAt is not null || !draft.Matches(complaint)) return Results.Conflict();
            if (!complaint.TrySaveDraft(draft.Copy))
                return Results.BadRequest(new { message = "Enter a single-line subject and a valid message." });

            var result = await Save(db, ct);
            return result is Microsoft.AspNetCore.Http.HttpResults.NoContent
                ? Results.Ok(new { version = Convert.ToBase64String(complaint.Version) }) : result;
        });

        review.MapPost("/{id:long}/publish", async (long id, ComplaintReviewWrite approved, ComplaintDb db, CancellationToken ct) =>
        {
            var complaint = await db.Complaints.FindAsync([id], ct);
            if (complaint is null) return Results.NotFound();
            if (!approved.Matches(complaint) || complaint.PublishedAt is not null) return Results.Conflict();
            // Save the exact approved copy and publication in one concurrency-checked write.
            if (!complaint.TrySaveDraft(approved.Copy)) return Results.BadRequest();
            complaint.TryPublish(DateTimeOffset.UtcNow);
            return await Save(db, ct);
        });

        app.MapGet("/api/complaints/published", async (ComplaintDb db, HttpContext context, long? offset, string? cursor, CancellationToken ct) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            if (!databaseConfigured) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            if (offset is < 0 or > int.MaxValue) return Results.BadRequest();
            PublishedCursor? boundary = null;
            if (cursor is not null && (!PublishedCursor.TryParse(cursor, out boundary) || offset is > 0))
                return Results.BadRequest();
            var rows = await PublishedRows(db.Complaints.AsNoTracking(), boundary)
                .Skip((int)(offset ?? 0)).Take(51).ToListAsync(ct);
            if (rows.Count > 50)
            {
                rows.RemoveAt(50);
                var last = rows[^1];
                context.Response.Headers["X-Next-Cursor"] = new PublishedCursor(last.PublishedAt!.Value, last.Id).Encode();
            }
            var copies = rows.Select(row => new ComplaintCopy(row.PublishedSubject, row.PublishedMessage));
            return Results.Ok(copies);
        }).RequireRateLimiting("complaints-published");
    }

    public static IOrderedQueryable<Complaint> PublishedRows(IQueryable<Complaint> complaints, PublishedCursor? cursor = null) =>
        complaints.Where(row => row.PublishedAt != null && (cursor == null ||
                row.PublishedAt < cursor.PublishedAt || (row.PublishedAt == cursor.PublishedAt && row.Id < cursor.Id)))
            .OrderByDescending(row => row.PublishedAt).ThenByDescending(row => row.Id);

    public static IQueryable<ComplaintCopy> PublishedCopies(IQueryable<Complaint> complaints) =>
        PublishedRows(complaints).Select(row => new ComplaintCopy(row.PublishedSubject, row.PublishedMessage));

    private static async Task<IResult> Save(ComplaintDb db, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new { message = "This complaint changed. Reload it and try again." });
        }
    }
}

public sealed record ComplaintReviewDetail(
    long Id, DateTimeOffset SubmittedAt, string? Name, string? Email, string? IpAddress,
    string Subject, string Message, ComplaintCopy? Draft, ComplaintCopy? Published, string Version)
{
    public static ComplaintReviewDetail From(Complaint complaint, bool isAdmin) =>
        new(complaint.Id, complaint.SubmittedAt, complaint.Name, isAdmin ? complaint.Email : null,
            isAdmin ? complaint.IpAddress : null, complaint.Subject, complaint.Message,
            complaint.DraftSubject is null ? null : new ComplaintCopy(complaint.DraftSubject, complaint.DraftMessage),
            complaint.PublishedAt is null ? null : new ComplaintCopy(complaint.PublishedSubject, complaint.PublishedMessage),
            Convert.ToBase64String(complaint.Version));
}

public sealed record ComplaintReviewWrite(string? Subject, string? Message, string? Version)
{
    public ComplaintCopy Copy => new(Subject, Message);
    public bool Matches(Complaint complaint) =>
        complaint.Version.Length > 0 && Version == Convert.ToBase64String(complaint.Version);
}

public sealed record PublishedCursor(DateTimeOffset PublishedAt, long Id)
{
    public string Encode() => Convert.ToBase64String(System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(this));

    public static bool TryParse(string value, out PublishedCursor? cursor)
    {
        cursor = null;
        if (value.Length > 256) return false;
        try
        {
            cursor = System.Text.Json.JsonSerializer.Deserialize<PublishedCursor>(Convert.FromBase64String(value));
            return cursor is { Id: > 0 } && cursor.PublishedAt != default;
        }
        catch (Exception error) when (error is FormatException or System.Text.Json.JsonException)
        {
            return false;
        }
    }
}
