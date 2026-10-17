# Home-screen recovery — 17 October 2026

## Reproduced cause

The live preview threw `TypeError: Illegal invocation` from ClockStore.subscribe and WeatherService.next. Both classes stored native browser timer functions and then invoked them as instance methods. Browser timers require the Window receiver; the Node test doubles did not enforce that requirement. Arrow wrappers now call `globalThis.setInterval/setTimeout/clearInterval/clearTimeout`, preserving the host receiver.

Two additional visible regressions were found while testing: the home navigator could grow past its flex container and hide page dots on a narrow screen; a newly started timer could display 05:01 because the shared clock tick predated creation. The navigator now reserves 40px for pagination and constrains the page scroller. Shared timer readout math clamps remaining time to the configured duration.

## Verified in the live isolated browser

- Home renders its clock, Liverpool weather, integration cards and active widgets after reload.
- All four home-page buttons open the intended page, including lazy app screens.
- Real pointer swipes move Home → Apps → Activity and back.
- Top-edge downward drag opens notifications; Escape closes the modal.
- A new quick timer starts at 05:00, pauses and survives navigation/reload. Only test-created quick timers were reset; existing timers/history were preserved.
- Active-widget paging selects Spotify without changing the home page.
- At 390×844, widgets form a vertical scroller and pagination remains inside the display bounds (bottom 822px, matching display bottom 822px).
- At 1280×800, the intended desktop home arrangement is visible. No new browser console errors were recorded during the final reload/timer check.
- Temporary viewport overrides were reset. Screenshot: `home-recovery-verified.png`.

## Automated coverage

32 tests pass, including new native-timer receiver regression tests for clock/weather and timer readout clamping. Full frontend lint, production build and bundle/import-boundary checks pass through `npm run verify`.

This supersedes the browser-blocked status for these home-screen flows in the earlier maintainability verification. It does not claim live household-integration or real-device touch coverage.
