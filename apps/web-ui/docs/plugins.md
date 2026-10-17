# Home System app packages

All external integrations belong to the control server. Apps use the shared server transport, never fetch/provider SDKs/new sockets. API credentials and tokens must not be bundled or stored in VITE variables. Media must pass core/ServerMedia.serverImage; external artwork uses a placeholder until the server supplies a same-origin proxy URL or embedded raster image. See the root docs/architecture/server-integration-boundary.md for enforcement and limitations.

Apps live under `src/plugins/<id>/`. The shell discovers manifests and entry modules automatically; adding an app does not require editing routes, launcher lists, dashboard lists or active-widget lists.

Each package contains:

Use `lazyApp(() => import('./ui/MyApp'))` from `application/lazyApp` for a split Page. The host calls its `.preload()` after login for installed apps; warming loads code/CSS only. Use the shared `AppTopBar` and `app-page` layout for a compact, display-native title/Home row. Do not add a second window header or opaque full-app background. Data loading/error feedback belongs inside the app content, independently of code loading.

- `manifest.json`: unique lowercase `id`, display `name`, semantic `version`, `apiVersion: 1`, description, color, defaultInstalled, launcher, required and dependency IDs.
- `plugin.jsx`: default descriptor exporting any of `Page`, `DashboardWidget`, `Controller`, `icon`, `getActiveWidgets(snapshot, context)`, `onInstall(context)` and `onUninstall(context)`.
- Its own UI, styles and app services. Keep shell imports out of app-specific code paths where possible; use shared runtime and transport APIs for integration.

`Controller` mounts only while the app is installed and the display is logged in. Use effect cleanup to stop polling, listeners and timers. `getActiveWidgets` returns `{ id, name, Component, props }` entries; the shell handles the swipe carousel. Dashboard components retain their own styling and layout. Optional `extraRoutes` in a manifest register a package's `Callback` component.

Use `runtime.setAppState(appId, patch)` for persisted local app data and runtime notification methods for shared alerts. Uninstall invokes package cleanup, removes its session and app data, and removes its routes/widgets immediately. Notification history is retained. The clock package additionally cancels its timers. Settings is a required system package so management remains reachable.

The App library installs/enables and uninstalls/disables packages already included in the deployment. Choices persist per display, not across devices. New source packages are discovered on the next build/deployment. This is not a remote marketplace, arbitrary JavaScript uploader, security sandbox or backend-service installer. Packages are trusted application code. Server-side integrations and the existing weather/Spotify transport compatibility facade still belong to the host; uninstall does not delete external accounts or server resources.

Verification: `npm test`, `npm run lint:runtime`, `npm run build`. Test in the isolated display at port 5174; open App library from the Apps page, uninstall an optional package, reload, reinstall, and confirm its route and widgets return.
