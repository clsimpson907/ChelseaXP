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
