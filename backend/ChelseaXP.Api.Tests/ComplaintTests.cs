using System.Security.Claims;
using System.Text.Json;
using ChelseaXP.Api.Complaints;
using Xunit;

namespace ChelseaXP.Api.Tests;

public sealed class ComplaintTests
{
    private static Complaint CreateComplaint() => new()
    {
        Subject = "Original subject", Message = "Original message",
        SubmittedAt = DateTimeOffset.UnixEpoch, Name = "Private name",
        Email = "private@example.invalid", IpAddress = "192.0.2.24",
    };

    [Fact]
    public void PublishingWithoutADraftLocksTheOriginalCopy()
    {
        var complaint = CreateComplaint();
        Assert.True(complaint.TryPublish(DateTimeOffset.UnixEpoch));
        Assert.Equal(complaint.Subject, complaint.PublishedSubject);
        Assert.Equal(complaint.Message, complaint.PublishedMessage);
        Assert.False(complaint.TrySaveDraft(new("Changed", "Changed")));
        Assert.False(complaint.TryPublish(DateTimeOffset.UnixEpoch.AddDays(1)));
        Assert.Equal(DateTimeOffset.UnixEpoch, complaint.PublishedAt);
    }

    [Fact]
    public void PublicProjectionReturnsOnlyPublishedSubjectAndMessage()
    {
        var published = CreateComplaint();
        Assert.True(published.TrySaveDraft(new("Public subject", "Public message")));
        Assert.True(published.TryPublish(DateTimeOffset.UnixEpoch));
        Assert.Equal("Original subject", published.Subject);
        Assert.Equal("Original message", published.Message);

        var draftOnly = CreateComplaint();
        Assert.True(draftOnly.TrySaveDraft(new("Draft", "Draft body")));
        var copy = Assert.Single(ComplaintReviewEndpoints.PublishedCopies(
            new[] { draftOnly, published, CreateComplaint() }.AsQueryable()));
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(copy, JsonSerializerOptions.Web));
        Assert.Equal(new[] { "message", "subject" }, json.RootElement.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("Public subject", json.RootElement.GetProperty("subject").GetString());
        Assert.Equal("Public message", json.RootElement.GetProperty("message").GetString());
    }

    [Theory]
    [InlineData("", "Valid body")]
    [InlineData("Multiline\nsubject", "Valid body")]
    [InlineData("Valid subject", " ")]
    public void InvalidDraftDoesNotReplaceTheExistingDraft(string subject, string message)
    {
        var complaint = CreateComplaint();
        Assert.True(complaint.TrySaveDraft(new("Draft", "Draft body")));
        Assert.False(complaint.TrySaveDraft(new(subject, message)));
        Assert.Equal("Draft", complaint.DraftSubject);
        Assert.Equal("Draft body", complaint.DraftMessage);
    }

    [Fact]
    public void OnlyTheAdminProjectionIncludesContactAddressAndIp()
    {
        var complaint = CreateComplaint();
        var moderator = ComplaintReviewDetail.From(complaint, false);
        var admin = ComplaintReviewDetail.From(complaint, true);
        Assert.Null(moderator.Email);
        Assert.Null(moderator.IpAddress);
        Assert.Equal(complaint.Email, admin.Email);
        Assert.Equal(complaint.IpAddress, admin.IpAddress);
    }

    [Fact]
    public void ReviewAccessRequiresTheAssignedRoleAndExpectedTokenClaims()
    {
        var tenant = Guid.NewGuid();
        var browser = Guid.NewGuid();
        var admin = new ComplaintReviewOwner(Guid.NewGuid());
        var moderator = Guid.NewGuid();

        ClaimsPrincipal User(Guid id, Guid? client = null, Guid? tokenTenant = null, string scope = "ComplaintReview.Access", bool authenticated = true) =>
            new(new ClaimsIdentity([
                new("oid", id.ToString()), new("tid", (tokenTenant ?? tenant).ToString()),
                new("azp", (client ?? browser).ToString()), new("scp", scope)
            ], authenticated ? "test" : null));
        bool CanReview(ClaimsPrincipal user) => ComplaintReviewAccess.HasReviewAccess(user, tenant, browser, admin, [moderator]);

        Assert.True(CanReview(User(admin.ObjectId)));
        Assert.True(admin.IsAdmin(User(admin.ObjectId)));
        Assert.True(CanReview(User(moderator)));
        Assert.False(admin.IsAdmin(User(moderator)));
        Assert.False(CanReview(User(Guid.NewGuid())));
        Assert.False(CanReview(User(admin.ObjectId, client: Guid.NewGuid())));
        Assert.False(CanReview(User(admin.ObjectId, tokenTenant: Guid.NewGuid())));
        Assert.False(CanReview(User(admin.ObjectId, scope: "Other.Scope")));
        Assert.False(CanReview(User(admin.ObjectId, authenticated: false)));
    }
}
