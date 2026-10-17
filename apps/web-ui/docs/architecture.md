# Frontend architecture

The wall-display layout, glass surfaces and swipe navigation are retained. The frontend is organised around an application host and self-contained app packages.

```
src/
  core/          Framework-independent stores, transport, storage, layout and gesture rules
  application/   Service instances, narrow subscriptions, generic plugin hosts and routes
  plugins/       One folder per app: manifest, lazy Page, optional Controller/widgets, own services
  features/      System notification shade/history/feedback and app library
  shared/        Modal, AppState, integration states, icons, clock and gesture hooks
  app/Home/      Home navigation and layout; launcher rendering
  components/    Login and compatibility presentation exports
```

## Ownership rules

- Add an app under `src/plugins/<id>` with `manifest.json` and `plugin.jsx`. Never add app-specific routes or imports to the shell. See PLUGIN-API.md.
- Descriptors are small startup modules. Standalone screens use React lazy imports and generic hosts own Suspense/errors. Home-specific Panel exports for Settings and Activity, plus the launcher, are intentionally eager: all four swipe panels stay ready without loading flashes. Inactive panels are inert, not unmounted.
- App controllers run while the package is installed and the profile is logged in, independently of mounted screens. They must return cleanup. WeatherService owns its requests/retries/listeners and rejects replies from an obsolete lifecycle.
- Never import another plugin's implementation. Exchange public data through host contracts (for example, weather publishes sun times to non-sensitive runtime globals for the clock).
- ServerClient owns the socket, correlation, bounded request timeout and reconnect. Commands fail on disconnect and are never replayed automatically.
- HomeRuntime owns persisted local sessions, timers, notification history and preferences. Use `setAppState(appId, patch)`; no credentials, tokens, PINs, sockets or functions. Timers persist deadlines, not second-by-second countdowns.
- `useHome(selector)` should select a stable existing branch or primitive. Returning a new object or array from the selector will invalidate snapshot caching. Unchanged writes are suppressed.
- ClockStore is reference-counted and shares one readout interval. Unmounted home pages do not retain local intervals. Timer completion has a separate lifecycle controller so it is not tied to visible clock readouts.
- LauncherLayout owns immutable validation, move/group/extract/hide/rename rules. Launcher JSX is presentation, not an alternative source of those rules. Uninstall removes local app data, session and launcher placements; notification history stays.
- Shared Modal owns native focus trapping, inert background, Escape and restoration. AppState owns unavailable/loading/empty feedback. ErrorBoundary isolates a failed view and offers retry without production stack overlays.
- `vars.css` is the canonical token source. The overview owns a responsive named grid; widgets own their content. Do not add absolute placement rules to new plugins.

## State and security boundaries

Storage is per display and shared by profiles on it, not server-synchronised. The existing trusted-device profile restoration contract is unchanged; this refactor does not constitute an authentication/security review. Spotify credentials stay on the server. Smart-home, camera and PC UI data adapters are not implemented: their screens must not pretend that mock controls operate real devices.

## Quality gates

Run `npm run verify`: full frontend ESLint, unit tests, production build, initial-bundle budgets and cross-plugin-import checks. Budgets are 430,000 bytes initial JS and 80,000 bytes initial CSS; the CSS allowance includes ready-mounted home panels. Additional standalone screens load on demand. Budgets concern transfer/parse footprint, not measured frame rate or device latency.

For isolated UI testing, start `node tests/fixture-server.mjs`, then:

```powershell
$env:VITE_WS_URL='ws://127.0.0.1:8499/ws'
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open http://127.0.0.1:5174, select UI Test and use PIN 1234. The fixture never connects to household devices. Verify home swipes, organiser/folders, timer persistence and completion, shade drag/keyboard, uninstall/reinstall and weather stop/retry. Live Spotify OAuth and integrations require the real server.

See docs/verification/Maintainability-rework-verification.md at repository root for current evidence and unverified boundaries.
