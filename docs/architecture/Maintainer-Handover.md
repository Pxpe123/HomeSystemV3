# Maintainer handover

Read this first, then each application's README. Current behaviour is defined by working source, `DESIGN.md`, `UX-CONTRACT.md` and the account/deployment guides. Historical reports describe their original verification date; the V4 product document is a future direction, not the active runtime.

## App ownership

| Application    | Entry and responsibility                                                                                                                                                                                                      | Build / output                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ControlServer  | `apps/control-server/src/Program.cs` → `Hosting/ControlServerHost`; WebSocket endpoint registry in `Transport/EndpointManager`; profiles in `Persistence/AccountRepository`; Spotify provider logic under `Endpoints/Spotify` | `npm run build:server` → `Deployments/control-server`                                               |
| WebUI          | `apps/web-ui/src/main.jsx` → `App.jsx`; `application/` composes services/plugins; `core/` owns reusable state; `plugins/` owns apps; `features/` owns host experiences                                                        | `npm run verify:web`, `npm run build:web` → `Deployments/web-ui`                                    |
| Display client | `apps/display-client/CMakeLists.txt`; desktop `src/main.cpp`; Android `src/main_android.cpp`, `DisplaySettings.h`, `qml/Main.qml`; loads hosted WebUI rather than bundling a second UI                                        | `npm run build:display`, `npm run build:android` → package/build locations documented in app README |
| Desktop agent  | `apps/desktop-agent/src/Program.cs` and monitoring helpers; Windows scaffold, not a connected production service                                                                                                              | `npm run build:agent` → `Deployments/desktop-agent`                                                 |

Shared .NET build settings are source under `scripts/build/`, not generated output. Each app retains its project/config/lockfiles. Root config applies formatting/build orchestration only. Current packaged apps are flat under `Deployments/`; caches, temporary bundles and installed toolchains belong in ignored `.local/`.

## Where changes belong

- New provider calls and all provider credentials belong on ControlServer, never browser code. Extend the endpoint registry and keep responses credential-free.
- Profile changes go through `AccountRepository`, not mutable Globals dictionaries. See [storage, recovery and migration](../guides/Accounts-and-Spotify.md).
- UI app lifecycle/state belongs in its plugin/service; presentation should use shared primitives and runtime tokens. Do not duplicate timers, notifications or server connections in a screen component.
- Spotify's phone receipt is server-rendered deliberately: it works before any display setup and is separate from the display's WebSocket notification.
- Testing deletion is an explicit server capability with typed confirmation, not a normal account button and not a password bypass for public deployments.
- Desktop/Android shell changes require native packages. Changes to the hosted WebUI only need the server/UI rollout and a page reload on clients already open.

## Working loop

1. Read the owning app README and nearest tests. Preserve `.server.env`, ignored local toolchain settings and data volumes.
2. Make one responsibility-specific change. Comments should explain ownership, invariants, security or unusual behaviour—not narrate obvious syntax or claim unfinished integrations work.
3. Run `npm run verify`, the account tests, and relevant native/.NET checks. Use the isolated UI fixture for visual work, not live Spotify accounts or test resets on the Pi.
4. `npm run build` packages all local platform sections; GitHub Build tests WebUI/.NET and publishes native ARM64 Docker images. Native Qt/Android binaries are not built by that Docker pipeline.
5. Push trusted `main` only after reviewing the diff. The Pi runner deploys the matching successful commit and verifies server/UI metadata. See [GitHub deployment](../guides/GitHub-Deployment.md). No passwords or runner credentials belong in source.

## Known boundaries, not hidden promises

- Household profiles intentionally are not authentication. The public callback domain requires network/access-control review before exposing any broader home API or enabling data reset.
- Profile/token persistence is implemented; old in-memory credentials do not magically migrate. Back up keys with account data. Image rollback cannot undo data changes.
- Provider pollers and parts of WebSocket/device handling remain legacy static/background code. Convert them to cancellable hosted services before multi-instance scaling or a deeper lifecycle rewrite.
- `src/Platform/` is experimental and is not the active endpoint protocol. Do not wire it in just because it exists.
- The desktop agent is a scaffold. Android packages are development/debug signed; store/MDM delivery and production signing are separate work.
- Build versions identify artifacts. Health checks and matching commits do not certify physical hardware, every provider API, or a successful human OAuth consent.

Formatting baseline: `.editorconfig`; use the WebUI's installed Prettier for JS/JSX/CSS/JSON/Markdown and `dotnet format whitespace` for C#. Generated outputs, dependencies, lockfiles and historical artifacts should not be manually reformatted. Keep descriptive modules small enough to test independently; avoid a cross-repo rename merely to change a comment.
