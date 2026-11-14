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

        review.MapPost("/{id:long}/draft", async (long id, ComplaintCopy draft, ComplaintDb db, CancellationToken ct) =>
        {
            var complaint = await db.Complaints.FindAsync([id], ct);
            if (complaint is null) return Results.NotFound();
            if (complaint.PublishedAt is not null) return Results.Conflict();
            if (!complaint.TrySaveDraft(draft))
                return Results.BadRequest(new { message = "Enter a single-line subject and a valid message." });

            return await Save(db, ct);
        });

        review.MapPost("/{id:long}/publish", async (long id, ComplaintDb db, CancellationToken ct) =>
        {
            var complaint = await db.Complaints.FindAsync([id], ct);
            if (complaint is null) return Results.NotFound();
            if (!complaint.TryPublish(DateTimeOffset.UtcNow)) return Results.Conflict();
            return await Save(db, ct);
        }).RequireAuthorization("ComplaintAdmin");

        app.MapGet("/api/complaints/published", async (ComplaintDb db, HttpContext context, long? offset, CancellationToken ct) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            if (!databaseConfigured) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            if (offset is < 0 or > int.MaxValue) return Results.BadRequest();
            var copies = await PublishedCopies(db.Complaints.AsNoTracking())
                .Skip((int)(offset ?? 0)).Take(50).ToListAsync(ct);
            return Results.Ok(copies);
        }).RequireRateLimiting("complaints-status");
    }

    public static IQueryable<ComplaintCopy> PublishedCopies(IQueryable<Complaint> complaints) =>
        complaints.Where(row => row.PublishedAt != null)
            .OrderByDescending(row => row.PublishedAt).ThenByDescending(row => row.Id)
            .Select(row => new ComplaintCopy(row.PublishedSubject, row.PublishedMessage));

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
    string Subject, string Message, ComplaintCopy? Draft, ComplaintCopy? Published)
{
    public static ComplaintReviewDetail From(Complaint complaint, bool isAdmin) =>
        new(complaint.Id, complaint.SubmittedAt, complaint.Name, isAdmin ? complaint.Email : null,
            isAdmin ? complaint.IpAddress : null, complaint.Subject, complaint.Message,
            complaint.DraftSubject is null ? null : new ComplaintCopy(complaint.DraftSubject, complaint.DraftMessage),
            complaint.PublishedAt is null ? null : new ComplaintCopy(complaint.PublishedSubject, complaint.PublishedMessage));
}
