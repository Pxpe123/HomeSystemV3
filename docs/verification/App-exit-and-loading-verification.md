# App exit and branded loading — 17 October 2026

- Shared AppSurface isolates the exit gesture to the left edge. Real browser: Notifications short 40px pull stayed in app; 326px rightward swipe returned to the saved Apps home panel. App controls and vertical scroll remain separate. Existing Home links provide a non-gesture alternative.
- Branded pending feedback reads existing descriptor icons and manifest colours. Spotify logo/glass emblem inspected through tests/loading-preview.html, a Vite-only visual fixture, with screenshot spotify-loading-review.png. Real app loading is not delayed for the demo.
- Preview browser reports system reduced motion: loader stays static and exit navigates without a delayed slide. Normal-motion CSS is implemented but normal animated appearance was not visually assessed under that preference.
- Added an app exit gesture regression covering short pulls, rightward commitment, vertical scrolling and cancellation. Existing background runtime unchanged.
- Root static audit retains only the existing separate display-client web/index.html:25 actionless button finding.
- Narrow 390px viewport: 196px edge swipe returned home correctly; viewport restored afterwards. Final verify passed ESLint, 38 tests, production build, plugin boundaries and bundle budgets (425409-byte initial JavaScript, 79213-byte CSS).
