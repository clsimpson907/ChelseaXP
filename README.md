# ChelseaXP

A Windows XP-inspired portfolio website.

## User guide

[Read the ChelseaXP User’s Guide](docs/user-guide.md).

When a major visitor-facing feature ships, update the relevant guide section in the same PR. Verify the steps against the feature and include current desktop or phone screenshots where they clarify the walkthrough.

## Local development

Install Node.js 24 with npm and the .NET 11 SDK. Run these commands from the repository root in separate terminals.

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

```sh
dotnet run --project backend/ChelseaXP.Api --no-launch-profile --urls http://localhost:5080
```

Vite prints the frontend URL. The API health endpoint at http://localhost:5080/api/health returns `{"status":"ok"}`.

## Build checks

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
dotnet build backend/ChelseaXP.Api --configuration Release
```

Azure Pipelines runs on pushes and pull requests targeting `main`, checks the frontend, smoke-tests the published API, and saves both build outputs as artifacts.

## API container

Build and run the Linux image locally with Docker.

```sh
docker build --tag chelseaxp-api backend/ChelseaXP.Api
docker run --rm --publish 127.0.0.1:8080:8080 chelseaxp-api
```

Open http://localhost:8080/api/health to check the container.

From the GitHub **Actions** tab, manually run **Publish API image** on `main`.
The workflow tests the image and publishes a commit-tagged image to GitHub
Container Registry. Use the image reference from the run summary when
deploying to Azure Container Apps, with an ingress target port of `8080`.
For anonymous pulls, set the package visibility to Public in GitHub Packages.

## Complaints

The API defaults to disabled. The production frontend build uses the public
Container App URL. For local Vite development, the form defaults to
`http://localhost:5080`; set `VITE_API_ORIGIN` before building to change it.

1. Run `backend/ChelseaXP.Api/Complaints/create-quota-table.sql` against
   the ChelseaXP database as a database administrator. Give the Container
   App's managed identity SELECT, INSERT, and DELETE on
   `dbo.ComplaintReservations`. Configure SQL networking for the app separately.
2. Verify a sender domain in Resend. Set the sender and your recipient inbox,
   and store a sending API key as a Container App secret.
3. Set these environment variables on the API revision. Put the connection
   string, API key, and a stable randomly generated client hash key in secrets.

| Setting | Value |
| --- | --- |
| `ConnectionStrings__Complaints` | Azure SQL connection string with `Authentication=Active Directory Managed Identity`, TLS enabled, and the ChelseaXP database specified |
| `Complaints__ResendApiKey` | Resend sending key |
| `Complaints__Sender` | Sender on the verified domain |
| `Complaints__Recipient` | Inbox for complaint notifications |
| `Complaints__ClientHashKey` | Random secret at least 32 characters long, shared across revisions |
| `Complaints__AllowedOrigins__0` | Exact frontend origin without a trailing slash |
| `Complaints__BehindContainerAppsIngress` | `true` for the public Azure Container Apps HTTP ingress |
| `Complaints__PerClientHourlyLimit` | Defaults to `3` per rolling hour |
| `Complaints__DailyLimit` | Defaults to `10` per UTC calendar day |
| `Complaints__Enabled` | Set to `true` once SQL and Resend are configured |

For local development, allow `http://localhost:5173` and use the local
connection settings for your SQL test environment. Only enable the ingress
setting when Azure Container Apps supplies the trusted forwarded client address.

Each request that passes the shared quota reserves a slot before contacting
Resend. Provider failures still use that slot, and SQL failures stop delivery.
SQL stores timestamps and keyed hashes of client addresses. Entries older than
two days are pruned when a new slot is reserved. Complaint text, name, and email
are sent privately to the configured inbox. A successful response means Resend
accepted the message for delivery.

## Visual assets

The folder, mail, and document icons are from the Windows XP High Resolution Icon Pack by the creator of [GUI Archive](https://guiarchive.blogspot.com/).
The LinkedIn shortcut uses the supplied vintage LinkedIn icon.
