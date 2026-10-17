# Run with Docker

The source stack is scripts/deployment/compose.yaml. It starts only the C# server and nginx WebUI, linked on the stable homesystem network. The server is internal; the UI is published on port 8088. Browsers and Qt displays use the UI address, and /ws and /api are reverse-proxied internally. Qt/Android remain native clients, not containers.

## Source build

Run from repo root:

```powershell
Copy-Item scripts/deployment/.env.example scripts/deployment/.env
docker compose --env-file scripts/deployment/.env -f scripts/deployment/compose.yaml config --quiet
docker compose --env-file scripts/deployment/.env -f scripts/deployment/compose.yaml up --build -d
```

Set HOMESYSTEM_PUBLIC_URL to the stable LAN URL used by all displays. Provider credentials stay in the local environment file and server only. Open that URL and complete connection/profile setup. First-run detects the same-origin gateway; no per-panel addresses are required.

Stop with the same Compose file and `down`. Keep the named homesystem-data volume. Do not remove volumes as a routine rebuild or rollback step.

## Built bundle

`npm run build` assembles current app outputs directly under Deployments, including an ARM64 Android test APK. Run `npm run verify:release` to verify Deployments/release.json. Copy the contents of Deployments to the target host and follow its README, using infra/compose.yaml to build images from the completed server and WebUI outputs. No timestamp directory or latest pointer is created; previous outputs are replaced only after all builds succeed.

The shared volume exists as a future persistence boundary, not proof that all legacy data is saved. Existing profile state is still in-memory and needs a persistence migration before unattended server restarts can preserve a household.

## Verified vs pending

Source server and agent publish, desktop Qt packaging, WebUI quality gates and Android APK packaging were executed successfully. The health endpoint now exists and the server runtime uses the ASP.NET image. Compose resolves successfully.

A running Docker daemon was unavailable during verification, so image builds, container boot, volume ownership and real network behaviour still require a Docker-enabled smoke test. Automatic CI rollout is a plan, not active deployment; see Development-and-Deployment.md.
