# Midnight coast UI refresh — 16 October 2026

User-authorised changes: launcher, settings, background and colour scheme, preserving the homepage arrangement and horizontal navigation.

## Evidence

- 19 runtime/plugin tests pass.
- Runtime lint and the rewritten settings page lint pass.
- Production build passes.
- Browser at isolated port 5174: home layout and launcher visually inspected; settings display and notification panels inspected; reduced-effects preference toggled, reloaded and restored; full-width top-edge drag opens shade; bottom-handle upward drag closes; pointer click does not open; Escape dismisses and restores focus.
- Screenshots: `coast-home-preview.png`, `coast-launcher-preview.png`, `coast-settings-preview.png`, `coast-shade-preview.png`.
- Strict repository UI audit: 13 remaining findings in existing display-client, mock apps and legacy styles. None in the new launcher refresh, settings rewrite or notification shade. See `coast-ui-audit.json`.
- Official DESIGN.md lint could not run: package is not present in the offline npm cache. No dependency was added.

## Boundaries

This is not a claim of complete WCAG certification. Narrow physical-device/touch testing, zoom and screen-reader coverage remain unverified. Responsive launcher/settings rules are included, but the home dashboard retains its existing fixed wall-display arrangement. Server-side profile creation was not exercised against a real household; its existing API and auto-switch behavior are unchanged. Profile deletion and pretend editable security/theme controls are no longer offered in the rewritten settings screen.

## Intentional design drift

The earlier DESIGN.md required the galaxy background. The current explicit user request supersedes that restriction: `vars.css` now owns the quiet navy/aqua background and semantic accent values, mirrored in DESIGN.md. Existing app brand colours (Spotify green, timer amber) remain intentional. Legacy mock app styling is not represented as fully migrated.
