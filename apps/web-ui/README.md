# HomeSystem web UI

React wall-display interface with a shared runtime and self-contained app plugins. The existing glass styling, swipe panels, persisted app state and app-specific widgets live under src/.

## Commands

Run `npm ci`, then `npm run dev` from this directory, or use the repository root convenience commands. The isolated preview uses `npm run dev:fixture` and `npm run dev` from the root in separate terminals; it stays on port 5174.

`npm run verify` runs lint, unit tests, production build and bundle/plugin-boundary checks. Build output stays in ignored dist/ and dependencies in ignored node_modules/.

## Ownership

- src/application: host services, plugin registration and lifecycle.
- src/core: testable state, storage, timing and transport models.
- src/plugins: self-contained installed app implementations.
- src/features: host launcher/library and notification behaviour.
- src/shared: reusable UI and hooks.
- src/app, components, context: display composition and remaining established adapters.
- tests: unit tests, isolated backend and Vite-only loading visual fixture.
- scripts: package build/import-boundary verification.

See [architecture](docs/architecture.md), [plugin API](docs/plugins.md) and the [repository documentation](../../docs/README.md). Root DESIGN.md and UX-CONTRACT.md remain the maintained UI contracts.
