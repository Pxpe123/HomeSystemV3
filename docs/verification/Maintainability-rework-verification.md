# Frontend maintainability rework — 17 October 2026

## Implemented slices

| Surface | Canonical implementation | Status |
| --- | --- | --- |
| Home navigation | Pointer-based SwipeGesture/useSwipeNavigation; only selected page mounted | Unit-tested; visual review pending |
| Home layout | Named responsive grid preserving familiar desktop positions | Build-checked; narrow-screen review pending |
| Launcher | Immutable LauncherLayout class; semantic app links; move/group/hide controls | Unit-tested; browser interaction review pending |
| Apps | Lazy full screens; generic Suspense and isolated error handling | Build verified with separate chunks |
| Weather | Package-owned WeatherService, lifecycle stop, stale response rejection and retry | Three service tests pass |
| Shared state | Selector subscriptions, no-op write suppression, shared readout clock | Unit-tested |
| Settings | One stylesheet rather than legacy-plus-override styles | Lint/build pass |
| Dialogs/error/empty states | Shared Modal/AppState; retryable production-safe ErrorBoundary | Lint/build pass; focus regression review pending |
| Activity/integration boundaries | Actual display counts; no simulated CPU/device/camera controls | Lint/build pass; real adapters still required |
| Quality enforcement | Whole-frontend ESLint + tests + build + size/import-boundary gates | `npm run verify` passes |

## Measurements

Before this rework, the previous production entry was approximately 467.88 kB JavaScript and 128.88 kB CSS. The new entry is approximately 405 kB JavaScript (about 13% smaller) and 62 kB CSS (about 52% smaller). Nine app-screen chunks load separately. These are initial entry asset measurements, not total application asset size or a claim of improved device frame rate. `scripts/verify-build.mjs` enforces 430 kB / 70 kB initial budgets and forbids imports between plugin implementations.

29 unit tests pass, including clock reference counting, no-op stores, launcher normalisation/grouping, gesture interpretation, app cleanup, timer state, transport, playback state and weather lifecycle/failure cases. Full frontend ESLint and production build pass. Root strict UI audit now has one remaining finding in the separate Qt display-client HTML; no web-ui source findings remain in this static audit. This is not accessibility certification.

## Browser verification blocker

The isolated fixture server (8499) and preview (5174) were restarted. Browser automation could not acquire the existing error-page tab because the browser security policy blocked it. No alternate browser surface or indirect workaround was used. Fresh visual, narrow-layout, gesture, focus and end-to-end interaction checks therefore remain unverified for this iteration. Earlier coast screenshots predate this architecture/layout iteration and must not be treated as its proof.

Open http://127.0.0.1:5174/ manually (UI Test / PIN 1234 if prompted) to review. No household server, real device, account or Spotify action was used in automated tests.

## Boundaries and recovery

The existing trusted-device profile restoration behavior remains unchanged and needs a separate security review before public exposure. Local state is per display, not cross-tablet synchronised. Real camera, smart-home and PC integration adapters are still not implemented. This slice intentionally removes misleading mock controls and their obsolete styles, not user data or server resources. The former developer-error overlay and stacked launcher/settings overrides have been retired in favour of shared components and single owners. Unrelated .NET, Qt, Android and reference-component changes were preserved.
