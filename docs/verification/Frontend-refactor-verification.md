# Restored-UI runtime verification

The current user preference supersedes the earlier redesign: existing home screens, swipe paging and styling are preserved. The added chrome is the requested slim top statusbar and notification shade. The existing app routes remain.

## Automated evidence

- `node --test tests/*.test.js`: 15 tests covering timer deadlines/reload/pause/cancel, stopwatch, notification history/read/dismiss/Undo/quiet mode, optional feedback, saved app/global state, invalid storage, socket response correlation/errors/shutdown and Spotify account races.
- `npm run lint:runtime`: scoped lint of the refactored runtime and migrated views.
- `npm run build`: production bundle compilation.
- `designmd lint DESIGN.md`: zero errors; documentation-only unused token warnings.

## Browser evidence

Verified with `tests/fixture-server.mjs` and Vite on port 5174, isolated from the real household server:

- Existing profile selection and keypad log in with fixture account UI Test / 1234.
- Original overview/launcher remain; page-dot controls switch pages and offscreen pages are inert.
- Invalid timer duration shows an inline error and focuses the duration field.
- A timer appears on the original ActiveApps widget after leaving its app; pause and remaining time survive reload; resume completes once and creates a notification.
- Background Spotify widget reflects the fixture track; pause toggles to resume without visiting Spotify.
- Shade opens with a downward pointer drag from the top handle. Escape/close restores focus. Native modal excludes the background from interaction.
- Mark all read clears the unread badge. Saved read/quiet state survives reload. Existing Notifications app shows the same history. Dismiss/Undo restores it.
- Shade inspected at default 1280×720 and 800×600 browser viewport. Original container now clamps to the viewport so its top handle remains reachable.
- Preview: `notification-shade-preview.png`.

## Limits / existing baseline

The repository-wide premium audit (`frontend-audit.json`) still reports 19 existing findings in Qt demo controls, camera/PC mock controls, appearance controls, legacy forms and scrollbar rules. These are not evidence that the migrated runtime failed its tests, and the scoped lint is not a claim that the entire legacy repository is clean.

The existing npm dependency audit reports 15 advisories; dependency upgrades were not silently applied. No real Spotify login, speaker playback, device power command or physical touch tablet was used in verification. Background Spotify integration uses the existing server endpoints; the fixture proves frontend lifecycle, not Spotify service availability. Timers and history are saved locally per display, not synchronised to other tablets. A running browser is needed to deliver completion feedback; overdue timers reconcile when it resumes.
