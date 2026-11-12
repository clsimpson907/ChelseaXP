IF OBJECT_ID(N'dbo.ComplaintReservations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ComplaintReservations (
        Id bigint IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ComplaintReservations PRIMARY KEY,
        ClientHash varchar(64) NOT NULL,
        CreatedUtc datetime2 NOT NULL
    );

    CREATE INDEX IX_ComplaintReservations_CreatedUtc
        ON dbo.ComplaintReservations (CreatedUtc);

    CREATE INDEX IX_ComplaintReservations_ClientHash_CreatedUtc
        ON dbo.ComplaintReservations (ClientHash, CreatedUtc);
END;
