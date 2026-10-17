# ControlServer

C# / ASP.NET Core integration host. Open HomeSystem.sln here; the solution also references the sibling Windows agent. Existing WebSocket messages and integrations remain compatible.

## Source ownership

- src/Program.cs: entry point.
- src/Hosting: composition root and validated environment options.
- src/Endpoints: application requests, including read-only System/Hello.
- src/Transport: WebSocket connections and module registration.
- src/Services: provider integrations / background work.
- src/Domain/Models: data types.
- src/Persistence/AccountRepository.cs: serialized atomic profile/account writes, encrypted tokens, schema and recovery boundary.
- tests/: dependency-free account/token lifecycle tests and real WebSocket/restart checks.
- src/Platform: existing experimental V4 code, not silently substituted for the active protocol.

`GET /api/health` reports service identity/readiness; `System/Hello` returns service identity + protocolVersion 1 over the shared WebSocket. Neither is authentication.

Build: `npm run build:server` from repo root. Run: `dotnet run --project apps/control-server/CentralServer.csproj`. Environment: PORT (default 8080), DEVMODE, PC JSON, WEATHER_API_KEY, WEATHER_LOCATION (Liverpool default), WebUI_URL and Spotify settings. Do not commit secrets.

Project SDK/config/lockfiles live here. Outputs go to .local/build, Deployments and .local/cache. The installed working SDK is pinned locally; the current framework target remains net9.0 and should be reviewed/upgraded to a supported LTS before production.

Profiles are password-free household selectors, not authentication. Profiles, links and encrypted Spotify tokens persist under HOMESYSTEM_DATA. Access token expiry is saved, refreshes are serialized per account, and rotated refresh tokens are saved before use. See [account storage](../../docs/guides/Accounts-and-Spotify.md). Provider polling/transport still include legacy static state; cancellation, network authentication and broader integration refactoring remain separate work.

Run account checks from this directory: `dotnet run --project tests/AccountTests.csproj -c Release` then `node tests/verify-accounts.mjs`. Neither contacts Spotify; the endpoint check uses a disposable local server and data directory. To enable the testing reset button, explicitly set `HOMESYSTEM_ALLOW_DATA_RESET=true`; leave it unset on public/normal deployments.

The canonical linked container stack is scripts/deployment/compose.yaml. See docs/guides/Development-and-Deployment.md for the deployment plan.
