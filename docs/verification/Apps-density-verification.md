# Apps density review — 17 October 2026

- Added a saved Compact/Expanded preference using the existing per-display app state. No new storage owner or app-placement model.
- Expanded: computed four columns and three equal rows at the wall-display width, capacity 12 tiles. Only installed/placed apps are rendered; no fake apps or empty placeholder cards. Further rows scroll internally.
- Compact: computed 12 columns at 1289px viewport, 92px rows; icon-only tiles keep accessible app names and title hints. Organise widens compact tiles to preserve editing controls.
- Browser verified switching, keyboard Enter activation, reload persistence, and 390px responsive layout without horizontal document overflow. Compact editing controls fit their cards. Viewport restored and preview left on Compact.
- `npm run verify`: ESLint passed, 35 tests passed, production build and plugin-boundary checks passed. Initial JavaScript 423569 bytes; initial CSS 76550 bytes, within existing budgets.
- Strict project audit retained one existing unrelated finding: actionless button in `Packages/display-client/web/index.html:25`. No findings in changed web-ui files.
- Updated DESIGN.md and UX-CONTRACT.md from the superseded two-column launcher decision to the explicitly requested density modes. Existing colours, typography, home swipe navigation and package library remain unchanged.

Screenshots: `apps-expanded-review.png`, `apps-compact-review.png`.
