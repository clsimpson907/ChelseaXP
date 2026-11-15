# ChelseaXP

A Windows XP-inspired portfolio website with a Windows Mobile-style interface on phones.

[Open ChelseaXP](https://chelseaxp.party)

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

## Frontend deployment

After a successful CI build on `main`, Azure Pipelines deploys the frontend artifact
to the `chelseaxp-web` Static Web App using the secret `SWA_DEPLOYMENT_TOKEN`.
Pull request validation builds skip deployment. The pipeline also supports a
manual run on `main` with **Deploy frontend to chelseaxp-web** selected.
A direct push to `main` also qualifies for automatic deployment, so use pull
requests for changes intended to deploy after merge.

The public domain is `chelseaxp.party`, with DNS managed in Cloudflare.

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

For configuration-only changes, open `chelseaxp-api` in Azure Portal and select
**Revisions and replicas > Create new revision**. Edit the existing container's
environment variables, keep its current image, and create the revision. An Azure
DevOps release and a fresh API image are only needed for their respective
deployment workflows, not to apply these settings.

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
| `Complaints__Sender` | `complaints@chelseaxp.party` once Resend verifies the domain for sending |
| `Complaints__Recipient` | Inbox for complaint notifications |
| `Complaints__ClientHashKey` | Random secret at least 32 characters long, shared across revisions |
| `Complaints__AllowedOrigins__0` | First exact frontend origin without a trailing slash. See the example below. |
| `Complaints__BehindContainerAppsIngress` | `true` for the public Azure Container Apps HTTP ingress |
| `Complaints__PerClientHourlyLimit` | Defaults to `3` per rolling hour |
| `Complaints__DailyLimit` | Defaults to `10` per UTC calendar day |
| `Complaints__Enabled` | Set to `true` once SQL and Resend are configured |

Allow each hostname that serves the site directly. Use one numbered entry per
origin, for example:

```text
Complaints__AllowedOrigins__0=https://salmon-mud-02182f11e.5.azurestaticapps.net
Complaints__AllowedOrigins__1=https://chelseaxp.party
Complaints__AllowedOrigins__2=https://www.chelseaxp.party
```

Include the `www` entry if it serves the site directly. A redirect to the apex
domain only needs the apex entry. Reuse the existing Resend key if its sending
scope includes the verified domain.

For local development, allow `http://localhost:5173` and use the local
connection settings for your SQL test environment. Only enable the ingress
setting when Azure Container Apps supplies the trusted forwarded client address.

The shared burst quota is three submissions per rolling 10 minutes across all
visitors. The per-client hourly and UTC daily limits are configurable.

After updating the revision, open Complaints from the public site and submit one
test complaint to verify inbox delivery. `GET /api/health` checks that the API
process responds. `GET /api/complaints/status` checks availability and quotas.
If the status endpoint responds directly but the browser shows
`STATUS_CHECK_FAILED`, check that the response includes
`Access-Control-Allow-Origin` matching the address bar's origin. If the endpoint
returns HTTP 503, check the active revision's configuration and console logs.
Availability alone does not verify Resend delivery.

Each request that passes the shared quota reserves a slot before contacting
Resend. Provider failures still use that slot, and SQL failures stop delivery.
SQL stores quota timestamps and keyed hashes of client addresses. Quota entries older
than two days are pruned when a new slot is reserved. The same transaction saves the
complaint for private review, including its IP address. A successful response means
the complaint was saved. Resend notification failures are logged, and the IP address
is omitted from the email.

Run `backend/ChelseaXP.Api/Complaints/create-complaints-table.sql` against the
complaints database before deploying the updated API. Run the backend unit tests
with `dotnet test backend/ChelseaXP.Api.Tests`.

## Visual assets

The folder, mail, and document icons are from the Windows XP High Resolution Icon Pack by the creator of [GUI Archive](https://guiarchive.blogspot.com/).
The shortcut uses a vintage LinkedIn icon. LinkedIn branding belongs to LinkedIn. See the [in-site credits source](frontend/src/credits.txt) for the full list.

## Complaints Department sign-in

Use a Microsoft Entra External ID external tenant and separate single-tenant app registrations for the browser and API. Register the browser as a **Single-page application**, with an exact redirect URI of `https://chelseaxp.party/auth-redirect.html` and the corresponding localhost URI for development. Also register the application origin as a redirect URI for the sign-out popup. Serve the sign-in bridge without a Cross-Origin-Opener-Policy header.

Configure the API registration to issue v2 access tokens. Expose the delegated scope `api://<api-client-id>/ComplaintReview.Access` and grant the browser registration that delegated permission. Associate the browser app with the external tenant's sign-in flow, disable self-service sign-up, and create the owner and invited reviewer accounts in the external tenant.

Set `VITE_ENTRA_TENANT_NAME`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_BROWSER_CLIENT_ID`, and `VITE_ENTRA_API_CLIENT_ID` in the frontend build environment. These are public identifiers. For Azure Pipelines, define them as non-secret pipeline variables so the build can read them. Set the matching API environment variables:

- `ComplaintReview__TenantName` and `ComplaintReview__TenantId`
- `ComplaintReview__BrowserClientId` and `ComplaintReview__ApiClientId`
- `ComplaintReview__AdminObjectId` and `ComplaintReview__ModeratorObjectIds__0` (add numbered entries for additional moderators)

Use each account's object ID in the external tenant. The API checks the token and the configured object IDs on each review request. Remove a moderator's ID and update the API revision to revoke their review access. Accounts without a review assignment cannot access the review session. Public complaint submission remains anonymous.

### Preview the Complaints Department locally

Open **Help and Support Center > Complaints Department** on the Vite development server. If Entra is unconfigured, the sample queue opens by default. Set `VITE_COMPLAINT_REVIEW_PREVIEW=true` in `frontend/.env.local` to force the preview or set it to `false` to turn it off. Restart Vite after changing environment settings. This opens a sample queue with an Admin and Moderator preview switch. The samples stay in the browser and require no API or Entra setup. Production builds ignore this setting.
