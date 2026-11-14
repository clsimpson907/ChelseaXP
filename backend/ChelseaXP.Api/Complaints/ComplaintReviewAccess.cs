using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace ChelseaXP.Api.Complaints;

public static class ComplaintReviewAccess
{
    public static void AddComplaintReviewAccess(this WebApplicationBuilder builder)
    {
        var settings = builder.Configuration.GetSection("ComplaintReview");
        var tenant = settings["TenantName"];
        var tenantId = settings["TenantId"];
        var apiId = settings["ApiClientId"];
        var browserId = settings["BrowserClientId"];
        var admin = settings.GetValue<Guid>("AdminObjectId");
        var moderators = settings.GetSection("ModeratorObjectIds").Get<Guid[]>() ?? [];

        var tenantObjectId = Guid.Empty;
        var browserClientId = Guid.Empty;
        var configured = !string.IsNullOrWhiteSpace(tenant) &&
            Guid.TryParse(tenantId, out tenantObjectId) &&
            Guid.TryParse(apiId, out _) &&
            Guid.TryParse(browserId, out browserClientId);

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            if (!configured)
                return;

            options.Authority = $"https://{tenant}.ciamlogin.com/{tenantId}/v2.0";
            options.Audience = apiId;
            options.MapInboundClaims = false;
        });
        var owner = new ComplaintReviewOwner(admin);
        bool CanReview(ClaimsPrincipal user) =>
            configured && HasReviewAccess(user, tenantObjectId, browserClientId, owner, moderators);

        builder.Services.AddAuthorizationBuilder()
            .AddPolicy("ComplaintReviewer", policy => policy.RequireAuthenticatedUser()
                .RequireAssertion(context => CanReview(context.User)))
            .AddPolicy("ComplaintAdmin", policy => policy.RequireAuthenticatedUser()
                .RequireAssertion(context => CanReview(context.User) && owner.IsAdmin(context.User)));
        builder.Services.AddSingleton(owner);
    }

    public static bool HasReviewAccess(ClaimsPrincipal user, Guid tenant, Guid browser, ComplaintReviewOwner owner, IReadOnlyCollection<Guid> moderators) =>
        user.Identity?.IsAuthenticated == true &&
        Guid.TryParse(user.FindFirst("tid")?.Value, out var tokenTenant) && tokenTenant == tenant &&
        Guid.TryParse(user.FindFirst("azp")?.Value, out var client) && client == browser &&
        user.FindFirst("scp")?.Value.Split(' ').Contains("ComplaintReview.Access") == true &&
        Guid.TryParse(user.FindFirst("oid")?.Value, out var objectId) && objectId != Guid.Empty &&
        (owner.IsAdmin(user) || moderators.Contains(objectId));

    public static void MapComplaintReviewAccess(this WebApplication app)
    {
        app.MapGet("/api/complaints/review/session", (HttpContext context, ComplaintReviewOwner owner) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new { role = owner.IsAdmin(context.User) ? "admin" : "moderator" });
        }).RequireAuthorization("ComplaintReviewer");
    }

}

public sealed record ComplaintReviewOwner(Guid ObjectId)
{
    public bool IsAdmin(ClaimsPrincipal user) =>
        ObjectId != Guid.Empty && Guid.TryParse(user.FindFirst("oid")?.Value, out var id) && id == ObjectId;
}
