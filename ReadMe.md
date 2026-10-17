# HomeSystem V3

[![Build](https://github.com/Pxpe123/HomeSystemV3/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Pxpe123/HomeSystemV3/actions/workflows/build.yml)
[![Deploy Pi](https://github.com/Pxpe123/HomeSystemV3/actions/workflows/deploy.yml/badge.svg)](https://github.com/Pxpe123/HomeSystemV3/actions/workflows/deploy.yml)

Pushes run WebUI checks, .NET builds and ARM64 Docker builds. Successful `main` builds publish a matched image pair and automatically deploy to the Pi once its runner is registered. Click the badges for live job progress and failure logs. See [automatic deployment setup](docs/guides/GitHub-Deployment.md).

Touch-first home display: React WebUI, C# ControlServer, Windows desktop agent and Qt display wrappers for desktop / Android.

## Where to work

- `apps/`: each application's source, project files and build configuration.
- `scripts/`: shared checks, build orchestration, deployment and operations.
- `docs/`: architecture, setup and dated verification.
- `Deployments/`: current built applications directly in their app folders—no timestamps or release/archive nesting.
- `.local/`: ignored build caches, tools and temporary packaging files.

Open `apps/control-server/HomeSystem.sln` for the .NET projects. Qt opens from `apps/display-client/CMakeLists.txt`. Root files are shared repository contracts/tooling only.

## Try the isolated UI

Run these in separate terminals from the repository root:

```powershell
node apps/web-ui/tests/fixture-server.mjs
npm run dev
```

Open http://127.0.0.1:5174/. First-run setup verifies the test server; choose Continue. Choose the UI Test household profile; no password is needed. Preview weather and playback are sample data, not real integrations.

## Build and run

```powershell
npm run verify
npm run android:check
npm run build
npm run verify:release
```

Configure your Qt/Android paths in ignored `apps/display-client/build.local.json` using its adjacent example. Full builds replace the current app folders directly under `Deployments/` after all applications succeed. `Deployments/release.json` records build checksums; no timestamp folders or latest pointer are needed. Android output is a debug-signed ARM64 test APK, not a production-signed release.

For the connected server/UI container stack, see [Docker setup](docs/guides/Run-with-Docker.md). For live development and the proposed automatic rollout, see [deployment flow](docs/guides/Development-and-Deployment.md).

[Repository layout](docs/architecture/repository-layout.md) · [Android setup](apps/display-client/README.md) · [Verification](docs/verification/2026-10-18-handover.md)

Profiles and encrypted Spotify tokens persist in the server data volume; household profiles deliberately have no passwords. See [account storage and migration](docs/guides/Accounts-and-Spotify.md) and [maintainer handover](docs/architecture/Maintainer-Handover.md). Provider lifecycle migration, network authentication and production signing remain explicit work.
