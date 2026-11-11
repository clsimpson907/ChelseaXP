# ChelseaXP

A Windows XP-inspired portfolio website.

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
