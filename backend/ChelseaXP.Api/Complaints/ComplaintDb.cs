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

    public async Task<bool> TryReserveAsync(string clientHash, ComplaintSettings settings, CancellationToken cancellationToken)
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
        var dailyCount = await Reservations.CountAsync(row => row.CreatedUtc >= now.Date, cancellationToken);
        var hourStart = now.AddHours(-1);
        var hourlyCount = await Reservations.CountAsync(
            row => row.ClientHash == clientHash && row.CreatedUtc >= hourStart, cancellationToken);
        if (dailyCount >= settings.DailyLimit || hourlyCount >= settings.PerClientHourlyLimit)
        {
            return false;
        }

        var retentionCutoff = now.AddDays(-2);
        await Reservations.Where(row => row.CreatedUtc < retentionCutoff).ExecuteDeleteAsync(cancellationToken);
        Reservations.Add(new ComplaintReservation { ClientHash = clientHash, CreatedUtc = now });
        await SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }
}

public sealed class ComplaintReservation
{
    public long Id { get; init; }
    public required string ClientHash { get; init; }
    public DateTime CreatedUtc { get; init; }
}
