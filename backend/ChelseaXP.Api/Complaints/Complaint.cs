using Microsoft.EntityFrameworkCore;

namespace ChelseaXP.Api.Complaints;

public sealed class Complaint
{
    public long Id { get; private set; }
    public required DateTimeOffset SubmittedAt { get; init; }
    public string? Name { get; init; }
    public string? Email { get; init; }
    public string? IpAddress { get; init; }
    public required string Subject { get; init; }
    public required string Message { get; init; }
    public string? DraftSubject { get; private set; }
    public string? DraftMessage { get; private set; }
    public string? PublishedSubject { get; private set; }
    public string? PublishedMessage { get; private set; }
    public DateTimeOffset? PublishedAt { get; private set; }
    public byte[] Version { get; private set; } = [];

    internal static void Configure(ModelBuilder modelBuilder)
    {
        var complaint = modelBuilder.Entity<Complaint>();
        complaint.ToTable("Complaints", "dbo");
        complaint.Property(row => row.Name).HasMaxLength(100);
        complaint.Property(row => row.Email).HasMaxLength(254);
        complaint.Property(row => row.IpAddress).HasMaxLength(64).IsUnicode(false);
        complaint.Property(row => row.Subject).HasMaxLength(120);
        complaint.Property(row => row.Message).HasMaxLength(2000);
        complaint.Property(row => row.DraftSubject).HasMaxLength(120);
        complaint.Property(row => row.DraftMessage).HasMaxLength(2000);
        complaint.Property(row => row.PublishedSubject).HasMaxLength(120);
        complaint.Property(row => row.PublishedMessage).HasMaxLength(2000);
        complaint.Property(row => row.Version).IsRowVersion();
        complaint.HasIndex(row => new { row.SubmittedAt, row.Id });
        complaint.HasIndex(row => new { row.PublishedAt, row.Id });
    }

    public bool TrySaveDraft(ComplaintCopy draft)
    {
        if (PublishedAt != null || !IsValidSubject(draft.Subject) || !IsValidMessage(draft.Message))
            return false;

        DraftSubject = draft.Subject;
        DraftMessage = draft.Message;
        return true;
    }

    public bool TryPublish(DateTimeOffset now)
    {
        if (PublishedAt != null)
            return false;

        PublishedSubject = DraftSubject ?? Subject;
        PublishedMessage = DraftMessage ?? Message;
        PublishedAt = now;
        return true;
    }

    internal static bool IsValidSubject(string? subject) =>
        subject is { Length: > 0 and <= 120 } && !string.IsNullOrWhiteSpace(subject) && !subject.Any(char.IsControl);

    internal static bool IsValidMessage(string? message) =>
        message is { Length: > 0 and <= 2000 } && !string.IsNullOrWhiteSpace(message);
}

public sealed record ComplaintCopy(string? Subject, string? Message);
