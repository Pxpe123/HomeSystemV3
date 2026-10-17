# Panel review — 17 October 2026

Implemented all five browser comments: badge-based weather hero; top-only active-widget dots without carousel arrows; three-row launcher and library; no back bar in embedded settings; settings sized as a native swipe panel. Home panels remain mounted, with inactive panels inert/aria-hidden, so swiping has no opening-app placeholder. Standalone routes retain loading/error handling.

## Sun times

The old preview used fixed 07:15/18:06 values. It now calculates solar events for the current Liverpool date/coordinates with NOAA geometry and Europe/London conversion. For 2026-10-17 it produces 07:42 and 18:11, matching the published timeanddate.com Liverpool reference to displayed-minute precision. Calculation, date and DST tests pass. It is labelled Calculated, not a live weather observation. Sample weather is labelled Preview. No fabricated high/low badges are displayed when their values are absent.

The server code also now requests the location's calendar date and converts API timestamps with `WEATHER_TIME_ZONE` (default Europe/London), rather than relying on the server/container timezone. Date/source/timezone travel with sun times. The .NET build remains blocked by an existing `Task.AsTask` compile error in `V4/HomePlatform.cs:139`; the production server change has not been end-to-end verified. External solar API access was unavailable in the sandbox, so the preview uses the local astronomical calculation. The unrelated V4 error was not changed.

## Verification

- Frontend lint, tests, build and budget/import-boundary gates pass.
- Browser confirms four mounted panels, no Opening app text, no embedded-settings Back to home button, and three launcher grid rows of about 156px each at 1280×800.
- A test-created quick timer plus Spotify confirms dots are above the active widget and no carousel-arrow buttons exist. The test-created timer was reset afterward; user timers/history and app installation choices were not changed.
- Library reviewed as nine cards in three rows. Screenshots: `panel-home-review.png`, `panel-apps-review.png`, `panel-settings-review.png`.
- The initial CSS budget was intentionally raised from 70 to 80 kB to include ready home panels; the 430 kB JavaScript budget stays enforced. This follows the explicit request to prioritise ready-to-swipe panels over lazy initial loading.

References: https://www.timeanddate.com/astronomy/uk/liverpool and https://gml.noaa.gov/grad/solcalc/calcdetails.html .
