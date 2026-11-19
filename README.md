# ChelseaXP

ChelseaXP is my developer portfolio, built as a Windows XP-inspired desktop with a Windows Mobile-style interface on phones. It uses my Bryce sunset artwork, a pink and lavender shell, and a cat who has agreed to supervise file searches.

[Open ChelseaXP](https://chelseaxp.party) · [Read the user guide](docs/user-guide.md)

## Current baseline

This document describes source commit `42d882a` on `fix/bugfixes`, reviewed on November 19, 2026. The Happy Fun Pack was merged to main in PR #39. The branch adds quiet published-complaint loading, shared virtual file-system data, corrected Run filtering, and consistent dialog title sizing. Production deployment of these branch fixes has not been verified.

The planning folder contains the project steering document and product specification. The steering document records collaboration and design decisions. The specification describes the implemented product and its verification criteria. This README owns engineering setup, configuration, API contracts, and deployment instructions. The user guide owns visitor instructions and is also rendered inside Help and Support.

## Features and architecture

| Area | Current behavior |
| --- | --- |
| Desktop shell | About Me at startup, Start menu, per-window taskbar buttons, overlapping windows, drag, resize, minimize, maximize, restore, and close |
| Virtual files | Shared folder and file data for Desktop, Explorer, Run, and Browse. Session mutations reset on reload |
| Explorer | History, address navigation, five views, Birby search, Favorites, session folder management, and Recycle Bin |
| Run | Supported virtual targets by name or path. History contains programs successfully launched through Run in the current visit |
| Browse | Reusable virtual picker with caller-supplied entries, places, filters, selection callback, and optional folder creation |
| Happy Fun Pack | Capped forkbomb.exe pop-up game in Downloads with shared window controls and 0.85–1.15-second spawn delays |
| Phone | Today, 2006 Calendar, Programs, About Me, LinkedIn, Control Panel, Help, Complaints, and program-only Run |
| Complaints | Anonymous submission, SQL quota enforcement, private storage, Resend notification attempt, and shared blue-screen feedback |
| Complaints Department | Entra sign-in, assigned Admin and Moderator roles, draft/redaction tools, and publication of public copies |
| Published complaints | Anonymous reading through Recycle Bin, quiet prefetch and refresh, bounded transient retries, and cached results |

File Explorer, file search, and Run’s Browse picker are desktop-only. The public résumé remains pending. LoveLife integrations, galleries, Magic 8 Ball, and additional themes remain future work.

React, TypeScript, and Vite run the frontend. ASP.NET Core .NET 11 runs the API. Entity Framework Core accesses Azure SQL. Resend handles notification email. Microsoft Entra External ID authenticates invited reviewers. Azure Static Web Apps hosts the frontend, Azure Container Apps hosts the API, GitHub holds source and API images, Azure Pipelines builds and deploys the frontend, and Cloudflare manages DNS.

### Shared frontend code

- `virtualFileSystem.ts` derives folders, files, paths, profile aliases, and Desktop membership from the shared session state. Views apply their own filters.
- `recycleFolders.ts` contains move, recycle, restore, and Favorites operations. `explorerLocations.ts` supplies built-in locations and shared folder-creation rules.
- `WindowTitleBar`, `WindowControls`, `DialogFrame`, and the `window-frame` class share window chrome. `BlueScreen` supplies the crash layout.
- `useNavigation`, `NavigationHistory`, `AddressPicker`, `ToolbarDropdown`, and `ChromeOverflow` supply navigation and menus.
- `BrowseDialog` is independent of Run’s launch behavior. `RunDialog` adapts Run targets to it.
- `publishedComplaints.ts` owns the in-memory public complaint cache, subscriptions, pagination, and shared in-flight refresh.

New built-in files require an explicit choice to enter the default Favorites list.

## Local development

Install Node.js 24 with npm and the .NET 11 SDK. From the repository root, install and start the frontend.

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Start the API in a separate terminal.

```sh
dotnet run --project backend/ChelseaXP.Api --no-launch-profile --urls http://localhost:5080
```

Vite prints the frontend URL. The API health endpoint at `http://localhost:5080/api/health` returns `{"status":"ok"}`. Portfolio pages and the virtual desktop work independently of complaint services.

### Frontend configuration

Set frontend variables before building. Vite embeds these values in the client bundle.

| Variable | Purpose |
| --- | --- |
| `VITE_API_ORIGIN` | Public API origin. Source fallback is `http://localhost:5080`; the production build configuration supplies the Container App URL |
| `VITE_ENTRA_TENANT_NAME` | External tenant name |
| `VITE_ENTRA_TENANT_ID` | External tenant ID |
| `VITE_ENTRA_BROWSER_CLIENT_ID` | SPA app registration ID |
| `VITE_ENTRA_API_CLIENT_ID` | API app registration ID |
| `VITE_COMPLAINT_REVIEW_PREVIEW` | Development-only sample review workspace override |

Entra IDs are public configuration. Store backend connection strings, email keys, and client hash keys server-side.

On the Vite development server, open **Help and Support → Complaints Department**. If Entra is unconfigured, the sample queue opens by default. Set `VITE_COMPLAINT_REVIEW_PREVIEW=true` in `frontend/.env.local` to force preview or `false` to disable it, then restart Vite. Preview supplies Admin and Moderator roles and browser-only sample drafts/publications. Production builds ignore the preview override.

## Checks

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
dotnet build backend/ChelseaXP.Api --configuration Release
dotnet test backend/ChelseaXP.Api.Tests
```

The frontend has lint and build scripts. It currently has no dedicated frontend test-runner script. Verify affected desktop and touch-phone journeys in a browser.

Azure Pipelines runs frontend lint/build, publishes the API, smoke-tests its health endpoint, and saves both outputs as artifacts. The pipeline currently does not invoke the backend unit-test command above. The separate GitHub image workflow also smoke-tests the built container.

The guide is imported by `HelpCenter.tsx`. Keep its `##` topic headings usable for navigation and preserve exact titles used by existing help links, including **Using Run** and **Complaint privacy notice**. Its renderer supports paragraphs, simple lists, bold text, inline code, and two-column tables.

## Complaint services

### Database setup

1. Run `backend/ChelseaXP.Api/Complaints/create-quota-table.sql` in the complaints database.
2. Run `backend/ChelseaXP.Api/Complaints/create-complaints-table.sql` in the same database.
3. Give the Container App’s managed identity SELECT, INSERT, and DELETE on `dbo.ComplaintReservations`.
4. Give that identity SELECT, INSERT, and UPDATE on `dbo.Complaints` for submission, review, and publication.
5. Configure SQL networking for the API and a managed-identity connection string.

The scripts create missing tables and indexes. Complaint review uses a SQL rowversion for concurrent updates. The reservation transaction uses a transaction-owned SQL application lock to serialize quota decisions across replicas, saves the complaint, and commits before contacting Resend.

### API configuration

Submission is disabled by default. Verify a sender domain in Resend and configure these environment variables on the API revision.

| Setting | Value or purpose |
| --- | --- |
| `ConnectionStrings__Complaints` | Azure SQL connection string with TLS, the complaints database, and `Authentication=Active Directory Managed Identity` |
| `Complaints__ResendApiKey` | Resend sending key |
| `Complaints__Sender` | Authorized sender, such as `complaints@chelseaxp.party` after verification |
| `Complaints__Recipient` | Private notification inbox |
| `Complaints__ClientHashKey` | Stable random secret of at least 32 characters, shared across revisions |
| `Complaints__AllowedOrigins__0` | First exact frontend origin, without a trailing slash |
| `Complaints__BehindContainerAppsIngress` | `true` when the API is behind the public Container Apps HTTP ingress |
| `Complaints__PerClientHourlyLimit` | Default `3` per rolling hour |
| `Complaints__DailyLimit` | Default `10` per UTC calendar day |
| `Complaints__Enabled` | Set `true` when SQL and email settings are ready |

Store the connection string, Resend key, and client hash key in Container App secrets. Add allowed origins as numbered entries.

```text
Complaints__AllowedOrigins__0=https://salmon-mud-02182f11e.5.azurestaticapps.net
Complaints__AllowedOrigins__1=https://chelseaxp.party
Complaints__AllowedOrigins__2=https://www.chelseaxp.party
```

Allow each hostname that serves the site directly. A hostname that redirects to another origin only needs the destination origin. For local development, allow the actual Vite origin, usually `http://localhost:5173`. Enable the ingress setting only where Container Apps supplies the trusted forwarded client address.

### Submission, data, and limits

The browser form requires email, subject, and message. Name is optional. Server validation permits an omitted email and validates its format when supplied. Limits are 100 characters for name, 254 for email, 120 for a single-line subject, and 2,000 for the message. The submission endpoint carries a 24 KiB request-size limit.

Each accepted reservation consumes quota even if Resend later fails. A 202 response means the complaint was saved. The email request uses the visitor’s supplied email as Reply-To and omits their IP address.

Quota defaults are three submissions per client per rolling hour, three shared per rolling ten minutes, and ten shared per UTC day. Hourly and daily caps are configurable. Reservation records contain UTC timestamps and keyed client-address hashes. Entries older than two days are pruned on the next successful reservation.

Private complaint rows retain the supplied name/email, IP address, subject, message, submission time, public draft, published copy, publication time, and rowversion. There is currently no automatic retention/deletion job for private complaints. Public responses include only the published subject and message.

### Endpoints

| Route | Access and behavior |
| --- | --- |
| `GET /api/health` | Anonymous process liveness check |
| `GET /api/complaints/status` | Anonymous availability and quota check, with state and optional resetAt |
| `POST /api/complaints` | Anonymous submission of name, email, message, and subject. Returns 202 when saved, 400 for invalid input, 429 for quotas, or 503 for paused/unavailable service |
| `GET /api/complaints/published?cursor=...` | Anonymous published subject/message copies, newest publication first, up to 50 per page |
| `GET /api/complaints/review/session` | Assigned reviewer’s role |
| `GET /api/complaints/review/inbox?beforeId=...` | Reviewer inbox, newest IDs first, up to 50 per page |
| `GET /api/complaints/review/{id}` | Private review detail, with email/IP supplied only to Admin |
| `POST /api/complaints/review/{id}/draft` | Save valid subject/message draft with the detail version, returning the new version on success |
| `POST /api/complaints/review/{id}/publish` | Atomically publish the supplied approved subject/message with the detail version, 204 on success |

Review routes require the ComplaintReviewer policy. Missing records return 404. Published items reject further draft edits. Competing updates can return 409. The public list and review responses use `Cache-Control: no-store`. The process has separate fixed-window throttles: 20 status checks, 120 public-list requests, and 60 submission requests per minute. Public reads cannot consume the status-check allowance.

### Quiet public loading

Production fetches published copies on site startup and when Recycle Bin or Complaints is entered. Concurrent refreshes share one promise. A post-publication request during a refresh queues a follow-up refresh.

Each page request has a 20-second timeout and at most three attempts. Network failures, timeouts, and HTTP 408/502/503/504 can retry after one and then three seconds. HTTP 429 retries the current page up to the same three-attempt limit, respecting Retry-After up to 60 seconds (60 seconds if absent). Longer waits stop the refresh. Other HTTP failures stop the attempt. Pages accumulate before replacing the cache, so a failed refresh retains earlier copies.

The folder stays visually quiet. Initial failure can leave it empty. There is no public loading screen or error banner. A new folder visit can retry after the failed refresh finishes.

This first request can give the API and SQL a head start, but the branch contains no Azure keep-alive job or minimum-replica change. Actual container cold-start and SQL wake-up behavior still needs production verification. Local review preview bypasses the remote public-list fetch.

## Complaints Department sign-in

Use a Microsoft Entra External ID external tenant and separate single-tenant registrations for the browser and API.

1. Register the browser as a **Single-page application** with `https://chelseaxp.party/auth-redirect.html` and the matching localhost URI.
2. Register the application origin as a redirect URI for the sign-out popup.
3. Serve the sign-in bridge without a Cross-Origin-Opener-Policy header.
4. Configure the API registration for v2 access tokens and expose `api://<api-client-id>/ComplaintReview.Access`.
5. Grant the browser that delegated permission and associate it with the external tenant’s sign-in flow.
6. Disable self-service sign-up and create the owner/invited reviewer accounts.

Set the four frontend Entra variables above as public pipeline build variables. Configure matching API settings.

| Setting | Purpose |
| --- | --- |
| `ComplaintReview__TenantName` | External tenant name |
| `ComplaintReview__TenantId` | External tenant ID |
| `ComplaintReview__BrowserClientId` | Authorized browser registration |
| `ComplaintReview__ApiClientId` | API audience |
| `ComplaintReview__AdminObjectId` | Owner account object ID in the external tenant |
| `ComplaintReview__ModeratorObjectIds__0` | Invited moderator object ID, with numbered entries for more |

The API validates authentication, tenant, browser client, delegated scope, and assigned object ID. Both Admin and Moderator can save drafts and publish. Both receive the submitted name and complaint text. Only Admin receives email and IP details. Remove a moderator’s configured object ID and update the API revision to revoke review access.

The UI supports selecting text for redaction, Undo/Redo, File → Save as draft, Publish, and Sign out. Publication locks the copy. The current endpoints provide no unpublish or complaint-deletion action.

## Deployment

### Frontend

Azure Pipelines builds pushes and PRs targeting main. After a successful CI build on main, the deploy stage sends the frontend artifact to `chelseaxp-web` with the secret `SWA_DEPLOYMENT_TOKEN`. PR validation skips deployment. A manual main run deploys when **Deploy frontend to chelseaxp-web** is selected.

A direct push to main also qualifies for deployment. Use the agreed PR/review workflow. Cloudflare manages the `chelseaxp.party` DNS.

### API image

Build and run locally when checking the container.

```sh
docker build --tag chelseaxp-api backend/ChelseaXP.Api
docker run --rm --publish 127.0.0.1:8080:8080 chelseaxp-api
```

Open `http://localhost:8080/api/health` to check process liveness.

From GitHub **Actions**, manually run **Publish API image** on main. It builds a Linux amd64 image, smoke-tests it, and publishes `ghcr.io/clsimpson907/chelseaxp-api:<commit-sha>`. Use the run summary’s image reference for the Container App revision, with ingress target port `8080`. Configure package visibility for anonymous pulls when needed.

For configuration-only changes, the existing documented Azure Portal route is **chelseaxp-api → Revisions and replicas → Create new revision**. Edit the container’s environment variables and create the revision using its current image. Verify the labels in the current portal before using the walkthrough.

## Troubleshooting and release verification

- If the public complaints folder is empty, inspect its anonymous published-list request and API logs. The UI intentionally hides refresh failures.
- If health succeeds but a data request fails, inspect SQL connectivity, table permissions, and database availability. Health does not query SQL.
- If a direct endpoint works but browser calls fail, check the allowed origin and the response’s Access-Control-Allow-Origin value.
- For a 503 on complaint submission or status, check Enabled, required configuration, active revision logs, and SQL access.
- For sign-in failures, check exact redirect URIs, tenant and client IDs, delegated permission, account assignment, and bridge headers.
- For slow first requests, distinguish container startup, SQL resume, authorization, and network errors using request timing and logs. Review costs before changing replica settings.
- Confirm email separately with an authorized test submission and inbox delivery. Successful storage alone does not prove notification delivery.
- After frontend or API rollout, verify the public anonymous path, the desktop/phone shell, the affected feature, and reviewer permissions where relevant.

Maintain the free-first cost target. The approved database direction is Azure SQL Database Free, subject to actual eligibility and configuration. Keep its free-allowance exhaustion behavior set to auto-pause when available, and verify that automatic paid overage is disabled. Any paid resources, always-on changes, or production deployment require the agreed approval.

## Visual assets

The folder, mail, document, toolbar, drive, Run, and other XP icons come from the Windows XP High Resolution Icon Pack by the creator of [GUI Archive](https://guiarchive.blogspot.com/). LinkedIn branding belongs to LinkedIn. The sunset wallpaper is Chelsea’s original Bryce artwork. The forkbomb meme was supplied by Chelsea.

See [Credits.txt](frontend/src/credits.txt) for the in-site credits, including the Start paw and Birby artwork.

Review writes require the `version` returned with private details. Stale or missing versions cannot publish or overwrite drafts. Deploy the API and frontend together for this contract change; older review clients must reload.

Public pagination returns subject/message arrays and an optional `X-Next-Cursor` response header. Send that opaque value as `cursor` for the next page. New publications do not shift an in-progress traversal. Legacy offset requests remain supported; deploy the cursor-aware API before the updated frontend.
