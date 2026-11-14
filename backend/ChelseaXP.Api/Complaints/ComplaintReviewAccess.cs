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
        builder.Services.AddAuthorizationBuilder()
            .AddPolicy("ComplaintReviewer", policy => policy.RequireAuthenticatedUser()
                .RequireAssertion(context =>
                    configured && Guid.TryParse(context.User.FindFirst("tid")?.Value, out var tokenTenant) &&
                    tokenTenant == tenantObjectId &&
                    Guid.TryParse(context.User.FindFirst("azp")?.Value, out var client) &&
                    client == browserClientId &&
                    context.User.FindFirst("scp")?.Value.Split(' ').Contains("ComplaintReview.Access") == true &&
                    Guid.TryParse(context.User.FindFirst("oid")?.Value, out var user) &&
                    user != Guid.Empty && (user == admin || moderators.Contains(user))));
        builder.Services.AddSingleton(new ComplaintReviewOwner(admin));
    }

    public static void MapComplaintReviewAccess(this WebApplication app)
    {
        app.MapGet("/api/complaints/review/session", (HttpContext context, ComplaintReviewOwner owner) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var user = Guid.Parse(context.User.FindFirst("oid")!.Value);
            return Results.Ok(new { role = user == owner.ObjectId ? "admin" : "moderator" });
        }).RequireAuthorization("ComplaintReviewer");
    }

    private sealed record ComplaintReviewOwner(Guid ObjectId);
}
