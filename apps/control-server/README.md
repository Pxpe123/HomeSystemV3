# ControlServer

C# / ASP.NET Core integration host. Open HomeSystem.sln here; the solution also references the sibling Windows agent. Existing WebSocket messages and integrations remain compatible.

## Source ownership

- src/Program.cs: entry point.
- src/Hosting: composition root and validated environment options.
- src/Endpoints: application requests, including read-only System/Hello.
- src/Transport: WebSocket connections and module registration.
- src/Services: provider integrations / background work.
- src/Domain/Models: data types.
- src/Persistence: persistence boundary; currently not a finished database.
- src/Platform: existing experimental V4 code, not silently substituted for the active protocol.

`GET /api/health` reports service identity/readiness; `System/Hello` returns service identity + protocolVersion 1 over the shared WebSocket. Neither is authentication.

Build: `npm run build:server` from repo root. Run: `dotnet run --project apps/control-server/CentralServer.csproj`. Environment: PORT (default 8080), DEVMODE, PC JSON, WEATHER_API_KEY, WEATHER_LOCATION (Liverpool default), WebUI_URL and Spotify settings. Do not commit secrets.

Project SDK/config/lockfiles live here. Outputs go to .local/build, Deployments and .local/cache. The installed working SDK is pinned locally; the current framework target remains net9.0 and should be reviewed/upgraded to a supported LTS before production.

The new baseplate preserves legacy modules behind a composition root. It is not a completed DI/lifecycle/authentication migration: profiles are still in-memory in existing Globals, provider services still include static state, and existing nullable/platform warnings remain. Persist household state and migrate services to cancellable hosted services before an unattended production rollout.

The canonical linked container stack is scripts/deployment/compose.yaml. See docs/guides/Development-and-Deployment.md for the deployment plan.
