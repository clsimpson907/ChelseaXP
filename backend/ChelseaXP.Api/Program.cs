using ChelseaXP.Api.Complaints;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.AddComplaintReviewAccess();
var complaintSettings = builder.Configuration.GetSection("Complaints").Get<ComplaintSettings>() ?? new();
var connectionString = builder.Configuration.GetConnectionString("Complaints");
var allowedOrigins = complaintSettings.AllowedOrigins;

builder.Services.AddSingleton(complaintSettings);
builder.Services.AddDbContext<ComplaintDb>(options => options.UseSqlServer(connectionString));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).WithMethods("GET", "POST").WithHeaders("Content-Type", "Authorization")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("complaints-status", limiter =>
    {
        limiter.PermitLimit = 20;
        limiter.Window = TimeSpan.FromMinutes(1);
    });
    options.AddFixedWindowLimiter("complaints", limiter =>
    {
        limiter.PermitLimit = 60;
        limiter.Window = TimeSpan.FromMinutes(1);
    });
});
builder.Services.AddHttpClient("Resend", client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

var app = builder.Build();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapComplaintReviewAccess();
app.MapComplaintReview(!string.IsNullOrWhiteSpace(connectionString));
app.MapComplaints(!string.IsNullOrWhiteSpace(connectionString));

app.Run();
