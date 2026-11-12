namespace ChelseaXP.Api.Complaints;

public sealed class ComplaintSettings
{
    public bool Enabled { get; init; }
    public bool BehindContainerAppsIngress { get; init; }
    public string[] AllowedOrigins { get; init; } = [];
    public int PerClientHourlyLimit { get; init; } = 3;
    public int DailyLimit { get; init; } = 10;
    public string? ClientHashKey { get; init; }
    public string? ResendApiKey { get; init; }
    public string? Sender { get; init; }
    public string? Recipient { get; init; }
}
