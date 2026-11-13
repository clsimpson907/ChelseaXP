using Microsoft.EntityFrameworkCore;

namespace ChelseaXP.Api.Complaints;

public sealed class ComplaintDb(DbContextOptions<ComplaintDb> options) : DbContext(options)
{
    public DbSet<ComplaintReservation> Reservations => Set<ComplaintReservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var reservation = modelBuilder.Entity<ComplaintReservation>();
        reservation.ToTable("ComplaintReservations", "dbo");
        reservation.Property(row => row.ClientHash).HasMaxLength(64).IsUnicode(false);
        reservation.HasIndex(row => row.CreatedUtc);
        reservation.HasIndex(row => new { row.ClientHash, row.CreatedUtc });
    }

    public async Task<ComplaintQuotaLimit?> GetLimitAsync(
        string clientHash, ComplaintSettings settings, DateTime now, CancellationToken cancellationToken)
    {
        var dailyCount = await Reservations.CountAsync(row => row.CreatedUtc >= now.Date, cancellationToken);
        if (dailyCount >= settings.DailyLimit)
        {
            return new("daily-limit", now.Date.AddDays(1));
        }

        var burstStart = now.AddMinutes(-10);
        var burstBoundary = await Reservations
            .Where(row => row.CreatedUtc > burstStart)
            .OrderByDescending(row => row.CreatedUtc)
            .Skip(2)
            .Select(row => (DateTime?)row.CreatedUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (burstBoundary is { } burst)
        {
            return new("burst-limit", DateTime.SpecifyKind(burst.AddMinutes(10), DateTimeKind.Utc));
        }

        var hourStart = now.AddHours(-1);
        var hourlyBoundary = await Reservations
            .Where(row => row.ClientHash == clientHash && row.CreatedUtc > hourStart)
            .OrderByDescending(row => row.CreatedUtc)
            .Skip(settings.PerClientHourlyLimit - 1)
            .Select(row => (DateTime?)row.CreatedUtc)
            .FirstOrDefaultAsync(cancellationToken);
        return hourlyBoundary is { } hourly
            ? new("hourly-limit", DateTime.SpecifyKind(hourly.AddHours(1), DateTimeKind.Utc))
            : null;
    }

    public async Task<ComplaintQuotaLimit?> TryReserveAsync(
        string clientHash, ComplaintSettings settings, CancellationToken cancellationToken)
    {
        await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
        // Serialize quota decisions across replicas and release the lock at commit or rollback.
        await Database.ExecuteSqlRawAsync("""
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock
                @Resource = 'ChelseaXP.ComplaintQuota',
                @LockMode = 'Exclusive',
                @LockOwner = 'Transaction',
                @LockTimeout = 3000;
            IF @result < 0 THROW 50001, 'Complaint quota lock unavailable.', 1;
            """, cancellationToken);

        var now = DateTime.UtcNow;
        if (await GetLimitAsync(clientHash, settings, now, cancellationToken) is { } limit)
        {
            return limit;
        }

        var retentionCutoff = now.AddDays(-2);
        await Reservations.Where(row => row.CreatedUtc < retentionCutoff).ExecuteDeleteAsync(cancellationToken);
        Reservations.Add(new ComplaintReservation { ClientHash = clientHash, CreatedUtc = now });
        await SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return null;
    }
}

public sealed record ComplaintQuotaLimit(string Code, DateTime ResetAt);

public sealed class ComplaintReservation
{
    public long Id { get; init; }
    public required string ClientHash { get; init; }
    public DateTime CreatedUtc { get; init; }
}
