IF OBJECT_ID(N'dbo.Complaints', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Complaints (
        Id bigint IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Complaints PRIMARY KEY,
        SubmittedAt datetimeoffset NOT NULL,
        Name nvarchar(100) NULL,
        Email nvarchar(254) NULL,
        IpAddress varchar(64) NULL,
        Subject nvarchar(120) NOT NULL,
        Message nvarchar(2000) NOT NULL,
        DraftSubject nvarchar(120) NULL,
        DraftMessage nvarchar(2000) NULL,
        PublishedSubject nvarchar(120) NULL,
        PublishedMessage nvarchar(2000) NULL,
        PublishedAt datetimeoffset NULL,
        Version rowversion NOT NULL
    );
    CREATE INDEX IX_Complaints_SubmittedAt_Id ON dbo.Complaints (SubmittedAt, Id);
    CREATE INDEX IX_Complaints_PublishedAt_Id ON dbo.Complaints (PublishedAt, Id);
END;
