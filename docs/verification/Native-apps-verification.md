# Native app routes and compact headers — 17 October 2026

- Shared heading replaces boxed app bars across Notifications, Timers, Weather, Settings/Activity standalone routes and the integration app pages. Spotify now uses the same heading and glass surface tokens. Header reduced after direct feedback: measured 57px and title 22px; no eyebrow/subtitle. Embedded home Settings retains its existing page variant.
- Notifications now uses a 220px filter rail and independent history scroller. Keyboard filter activation and 390px layout verified in the live browser without document horizontal overflow. Notifications and Spotify reviewed at display width; screenshots retained.
- All seven split app descriptors use the shared lazy/preload helper. Installed apps warm after login; importer cache is shared and rejected warm requests can retry. Normal fast code resolution never shows loading copy; real waits show feedback after 250ms. Initial direct-route heading appears immediately.
- Verify passed: ESLint, 37 tests, production build, plugin import boundaries and existing bundle budgets. Two new tests cover shared warm/render requests and failed warm-up retry.
- Root strict audit retains the existing separate display-client actionless button finding at web/index.html:25; changed app files have no audit findings.
- App package installation/security boundaries, backend connections and data loading semantics are unchanged. Preloading does not mount app pages or make disconnected integrations functional.
