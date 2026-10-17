# HomeSystem frontend behaviour

Business evidence: current user request (preserve restored UI; shared app state, widgets, saved notifications/globals, pull-down shade), existing `apps/web-ui/src/App.jsx` routes, and control-server `src/Transport/EndpointManager.cs` / Spotify handlers. `docs/product/V4-Product-and-Experience.md` is a future vision; its proposed visual rebrand is superseded by the user's explicit restored-UI preference.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Variants | Verification |
| --- | --- | --- | --- | --- |
| Toast | NotificationShade | HomeRuntime | info / success / warning / error | runtime tests + browser |
| Form | TimerApp | HomeRuntime duration rules | create timer | invalid / valid submit |
| Scrollbar | Existing app styles | vars.css | scoped feature scroll | browser |
| CRUD | HomeRuntime | versioned StorageRepository | notifications / timers / settings | runtime tests |
| Dialog | NotificationShade native dialog | React open state | modal shade | focus / Escape / close |
| App modal | shared/ui/Modal | caller state | launcher folder / uninstall | pure layout tests; browser review pending |
| Empty/error/loading | shared/ui/AppState and ErrorBoundary | plugin and service snapshots | unavailable / opening / failure | lint/build; browser review pending |
| App placement | core/LauncherLayout | appData.launcher.layout | folder / app / hidden | foundations tests |

## State and workflow ownership

- First-run connection is owned by features/setup/SetupGate and core/ConnectionSettings, before profile requests. It automatically checks the detected /ws endpoint with read-only System/Hello, requires HomeSystem identity and protocol version 1, and saves only a validated credential-free endpoint after Continue. Setup can be reopened at /setup from Connection settings. HTTPS displays reject insecure WebSockets. Offline, incompatible server, timeout and storage failure are recoverable; no fake success or LAN scanning. Production uses the same-origin gateway and its restrictive CSP.

- Installed app routes share an edge-swipe exit surface: start inside the leftmost 28px below the header and drag right at least 75px to return to the saved home panel. Short pulls settle back; vertical scrolling and leftward swipes do not exit. Only the edge captures the gesture, not app content. A 360ms slide completes before navigation; reduced motion/effects navigate immediately. Home links remain the keyboard/non-gesture alternative. Pending exit timers clean up on unmount and closing does not cancel background app state.
- Real app-code waits use the plugin descriptor's own icon and manifest colour, with a soft breathing emblem/ring and loading dots. The existing 250ms feedback delay prevents fast-load flashes; no artificial app delay is added. System reduced motion and saved Reduced effects stop animations. The Vite-only tests/loading-preview.html fixture exercises loading visuals without slowing real apps.

- Installed app pages remain lazy chunks, with a shared cached preload entry point. After login the host warms installed app code/CSS without mounting app pages or triggering their UI data effects. Failed warming is handled silently and can retry on opening. Route loading immediately retains the native heading; loading feedback appears only after 250ms and cancels when ready. App-to-app deferred navigation preserves the previous ready app while the next chunk resolves. Genuine app-data loading/error states remain visible and honest.

- Home panel motion is owned by Home.css: 680ms eased glide with subtle scale/opacity depth, direct track movement while dragging, and the same settling for page-dot navigation. Both system reduced motion and the saved Reduced effects preference disable transitions and depth effects. Panel mounting and gesture thresholds are unchanged.

- Timer create → immediate saved running timer → appears in ActiveApps → completion creates one persisted notification. Pause freezes remaining duration, resume creates a new deadline, cancel removes the timer. No server command is sent.
- Stopwatch is shared between ClockWidget, TimerApp and ActiveApps and recovers after reload.
- Opening another app does not stop background work. Account changes clear Spotify state and invalidate old requests.
- Playback commands wait for server outcome; no fire-and-forget optimistic claim. Error feedback is shared with notification history. Offline commands fail rather than replaying later.
- Notification shade follows a downward pointer gesture from the full-width top 28px edge; release beyond 80px opens it, short pulls cancel. A bottom handle accepts upward drag beyond 60px to dismiss. Pointer clicks do not open it. Keyboard Enter/Space/ArrowDown on the top edge opens; Close/Escape dismisses. Opening does not mark messages read. Mark read and dismiss are explicit; filters do not mutate history. History is capped at 100 entries.
- Settings groups display, notifications, household and connection. Controls save immediately through HomeRuntime; reduced effects changes the runtime document attribute and CSS. Security status is informational, not a pretend editable setting. Household creation uses the existing server workflow, which switches to the new profile after success.
- App layout, page selection and non-sensitive globals are versioned browser state. This is per-display persistence, not cross-tablet synchronisation. Existing login PIN flow remains.
- Local time/date formatting uses en-GB. Scoped feature classes preserve existing sibling visual styles.
- All four home swipe panels stay mounted and ready; inactive panels are inert and aria-hidden. No app-loading placeholder is used for swiping. Standalone app routes may still load on demand. Settings/Activity receive an explicit embedded variant without an app back bar.
- Launcher organisation uses named move/group/hide actions with keyboard equivalents instead of a drag-only dependency. Layout operations normalise stale IDs and duplicate placements. Removing an app removes its launcher placements as well as its widgets and state.
- Weather requests, retry scheduling, stale-response protection and cleanup belong to the weather package. The transport provider no longer broadcasts weather countdowns to every app.
- Home activity reports actual installed-app, timer and notification counts; no CPU, memory or camera status is invented. Camera, smart-home and PC integration screens expose an honest not-connected boundary until their adapters exist.
- Active-widget dots appear above the selected widget only when multiple widgets exist; carousel arrows are removed. Playback transport buttons remain app controls, not carousel navigation.
- The home launcher offers Compact (dense icon-only) and Expanded (four columns and three rows at wall-display width). The view choice persists independently in appData.launcher.viewMode; switching never changes app order or folders. Icon-only targets retain accessible names and title hints. Compact organisation widens tiles to keep editing controls reachable. The nine-package library stays three columns and three rows. Additional items and smaller viewports scroll without hiding actions.
- Sun times require a matching local date and Europe/London timezone. The isolated preview calculates Liverpool solar events from date/coordinates with NOAA solar geometry and labels them Calculated; weather readings remain explicitly Preview data. The server converts API timestamps with an explicit location timezone, not the container timezone.

## Deferred boundaries

Existing authentication, mock smart-home/PC/statistics screens and server database work are not redesigned or represented as complete in this frontend refactor. No permission/security policy is invented. Local display storage is shared by profiles on that display. The server remains the authority for integration state and credentials.
