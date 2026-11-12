using System.Data.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ChelseaXP.Api.Complaints;

public static class ComplaintEndpoints
{
    private const int MaxMessageLength = 2000;

    public static void MapComplaints(this WebApplication app, bool databaseConfigured)
    {
        var logger = app.Logger;
        app.MapGet("/api/complaints/status", async (
            HttpContext context, ComplaintSettings settings, ComplaintDb database, CancellationToken cancellationToken) =>
        {
            context.Response.Headers.CacheControl = "no-store";

            if (!settings.Enabled)
            {
                return Results.Ok(new { state = "paused" });
            }

            if (!IsConfigured(settings, databaseConfigured))
            {
                return TemporarilyUnavailable();
            }

            var dayStart = DateTime.UtcNow.Date;
            try
            {
                if (await database.IsDailyLimitReachedAsync(settings.DailyLimit, dayStart, cancellationToken))
                {
                    return Results.Ok(new { state = "daily-limit", resetAt = dayStart.AddDays(1) });
                }

                return Results.Ok(new { state = "available" });
            }
            catch (Exception error) when (error is DbException or DbUpdateException)
            {
                LogDatabaseFailure(logger, error);
                return TemporarilyUnavailable();
            }
        }).RequireRateLimiting("complaints-status");

        app.MapPost("/api/complaints", async (
            ComplaintSubmission submission, HttpContext context, ComplaintSettings settings,
            ComplaintDb database, IHttpClientFactory clients, CancellationToken cancellationToken) =>
        {
            if (!settings.Enabled)
            {
                return Results.Json(new { code = "paused", message = "Complaints is offline for now." }, statusCode: 503);
            }

            if (!IsConfigured(settings, databaseConfigured))
            {
                logger.LogWarning("Complaints is enabled but its configuration is incomplete.");
                return TemporarilyUnavailable();
            }

            var name = submission.Name?.Trim();
            var email = submission.Email?.Trim();
            var message = submission.Message?.Trim();
            if (name?.Length > 100 || email is not { Length: > 0 and <= 254 } ||
                !MailAddress.TryCreate(email, out var address) || address.Address != email ||
                message is not { Length: > 0 and <= MaxMessageLength })
            {
                return Error(400, "Enter a valid email and a message of up to 2,000 characters. Name is optional.");
            }

            var clientHash = HashClient(context, settings);
            try
            {
                var quota = await database.TryReserveAsync(clientHash, settings, cancellationToken);
                if (quota.DailyResetAt is { } resetAt)
                {
                    return Results.Json(new
                    {
                        code = "daily-limit",
                        message = "Today's complaint inbox is full.",
                        resetAt,
                    }, statusCode: 429);
                }

                if (!quota.Reserved)
                {
                    return Error(429, "The submission limit has been reached. Please try again later.");
                }
            }
            catch (Exception error) when (error is DbException or DbUpdateException)
            {
                LogDatabaseFailure(logger, error);
                return TemporarilyUnavailable();
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ResendApiKey);
            request.Content = JsonContent.Create(new
            {
                from = settings.Sender,
                to = new[] { settings.Recipient },
                reply_to = email,
                subject = "New ChelseaXP complaint",
                text = $"Name: {(string.IsNullOrEmpty(name) ? "Not provided" : name)}\n\n{message}",
            });

            try
            {
                using var response = await clients.CreateClient("Resend")
                    .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    return Results.Accepted();
                }

                logger.LogWarning("Resend rejected a complaint notification with status {Status}.", (int)response.StatusCode);
            }
            catch (Exception error) when (error is HttpRequestException ||
                (error is OperationCanceledException && !cancellationToken.IsCancellationRequested))
            {
                logger.LogWarning("The complaint email request could not be completed.");
            }

            return TemporarilyUnavailable();
        })
        .WithMetadata(new RequestSizeLimitAttribute(24 * 1024))
        .RequireRateLimiting("complaints");
    }

    private static bool IsConfigured(ComplaintSettings settings, bool databaseConfigured) =>
        databaseConfigured && !string.IsNullOrWhiteSpace(settings.ResendApiKey) &&
        !string.IsNullOrWhiteSpace(settings.Sender) && !string.IsNullOrWhiteSpace(settings.Recipient) &&
        settings.ClientHashKey is { Length: >= 32 } &&
        settings.PerClientHourlyLimit > 0 && settings.DailyLimit > 0;

    private static void LogDatabaseFailure(ILogger logger, Exception error)
    {
        var cause = (error as DbUpdateException)?.InnerException ?? error;
        var codes = cause is SqlException sqlError
            ? string.Join(", ", sqlError.Errors.Cast<SqlError>().Select(item => $"{item.Number}/{item.State}"))
            : "none";
        logger.LogWarning(
            "The complaint quota database is unavailable. Error type: {ErrorType}. SQL number/state: {SqlCodes}.",
            cause.GetType().Name, codes);
    }

    private static string HashClient(HttpContext context, ComplaintSettings settings)
    {
        var ip = context.Connection.RemoteIpAddress;
        if (settings.BehindContainerAppsIngress)
        {
            // Container Apps appends the authoritative address at the right edge.
            var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
            var last = forwarded[(forwarded.LastIndexOf(',') + 1)..].Trim();
            if (IPAddress.TryParse(last, out var forwardedIp))
            {
                ip = forwardedIp;
            }
        }

        if (ip?.IsIPv4MappedToIPv6 == true)
        {
            ip = ip.MapToIPv4();
        }

        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(settings.ClientHashKey!),
            Encoding.UTF8.GetBytes(ip?.ToString() ?? "unknown"));
        return Convert.ToHexString(hash);
    }

    private static IResult Error(int status, string message) => Results.Json(new { message }, statusCode: status);

    private static IResult TemporarilyUnavailable() =>
        Error(503, "Complaints is temporarily unavailable. Please try again later.");
}

public sealed record ComplaintSubmission(string? Name, string? Email, string? Message);
