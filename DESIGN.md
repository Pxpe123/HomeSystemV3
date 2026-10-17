---
version: alpha
name: HomeSystem glass display
description: Preserve the original wall-display UI while introducing shared application behaviour.
colors:
  primary: '#89dbd0'
  success: '#00D9A3'
  warning: '#FFB74D'
  danger: '#FF6B9D'
  background: '#101c30'
  text: '#ffffff'
typography:
  sans:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  mono:
    fontFamily: 'SF Mono, Consolas, Monaco, monospace'
rounded:
  DEFAULT: '0.5rem'
  panel: '1rem'
spacing:
  base: '1rem'
  panel: '1.5rem'
components:
  notificationShade:
    rounded: '24px'
---

# HomeSystem design context

## Overview

The October 16 refresh is authorised to replace the space background and colour scheme, while retaining transparent glass, the clock, dashboard widget positions and horizontal swipe-through home screens. Midnight coast uses a quiet aqua/navy aurora rather than a busy photograph. Do not replace the homepage with a sidebar/dashboard template. This is a household wall display, not a desktop admin portal. English UK is the existing locale. No Japan-market scope.

## Colors

Runtime ownership stays in `apps/web-ui/src/vars.css`. Frontmatter mirrors its named accents; features consume those CSS variables directly. Notification and timer feature styles are scoped under `hs-` classes and must not reset the rest of the app.

## Typography

Use the existing system font for labels and controls, with light system display weights for clock and headings. Timers use `--font-family-mono` for stable numeric readouts. Do not download fonts. Launcher and settings headings use a restrained 28–32px scale.

## Layout

Keep the familiar 1280×800 arrangement and four swipe pages. The overview owns a named CSS grid: clock/weather/smart-home across the top, active app/PC beneath, smart home spanning both rows. Widgets own their interiors, not placement. Below 850px the grid becomes two columns and scrolls vertically; below 520px it becomes one column. New apps fit the existing full-screen app wrapper. The top edge has a subtle 28px pull zone with a small handle, no status labels. Clicking does not open notifications; downward drag does. Keyboard Enter/Space/ArrowDown remains available. ActiveApps shows one purpose-built app widget at a time, with an independent swipe carousel and small navigation dots. Weather uses an icon-and-temperature grid with the condition underneath and compact detail spacing.

## Elevation & Depth

Preserve backdrop blur, translucent fills, soft borders and shadows. `vars.css` owns `--surface-glass`, `--surface-solid`, the aqua primary, lavender secondary, navy background and global scrollbar tokens. The shade has a navy surface over a modal backdrop. Launcher tiles use 24px corners; settings groups use 22px corners. The static aurora gradient is the signature element and remains quiet behind content.

## Shapes

Use existing radius variables on app panels and controls. The shade rounds its bottom corners to signal its pull-down origin.

## Components

Profiles retain the existing glass selector and Settings rows, but use name-only creation and one-touch household selection. They are explicitly not password-protected accounts. The destructive testing reset reuses shared Modal/button/input styles, with a typed confirmation and initial focus on the safe action. Spotify's standalone phone receipt is server-rendered in the same navy/aqua/system-font language so it can confirm a saved link without loading the home display UI; it is not an app panel or a new theme.

First-run setup uses one centred glass surface with existing aqua actions, system typography and the same radius/border tokens. Connection state lives inline; it does not introduce a separate theme or hide profile authentication behind a fake connected state. All setup colours consume vars.css (accent-primary, text-primary, border-primary and surface-glass); no new colour tokens.

App exit is a left-edge rightward swipe with a quiet vertical aqua cue; Home remains the accessible fallback. Loading identity comes from plugin icons/colours (Spotify logo, notification bell, timer clock) in a softly pulsing glass emblem, not a generic spinning retry symbol. Do not force loading animations when content is already ready.

Installed app routes use the shared AppTopBar as a compact native heading, not a boxed window bar: 22px title, Home action, no eyebrow/subtitle, 57px header height at wall width. AppPage owns responsive outer spacing; app content owns internal scroll. Notifications uses the Settings-style 220px rail/history split. Spotify keeps its music controls but uses host glass surfaces, not an opaque black application background.

The October 17 review makes home panels native and persistent: settings has its own page heading, not a floating app back bar. Launcher has a saved Compact/Expanded switch: Compact uses dense icon-only tiles (12 columns at the wall-display width), and Expanded uses four columns/three rows with names and descriptions; smaller screens reduce columns. App order and folders are shared between views; the package library is three columns/three rows at wall width. Weather uses a temperature/icon hero with condition and feels-like pills; high/low badges appear only when values exist. Active-widget dots sit at the top without carousel arrows. All home panels are ready before swiping; standalone apps retain lazy routes. This deliberately trades a little initial CSS for immediate navigation (80 kB initial CSS budget; JavaScript remains 430 kB).

Existing UI components own presentation. Feature services own behaviour. ActiveApps occupies its original slot; timers and Spotify widgets populate it. The existing Notifications app and shade use one NotificationList and HomeRuntime. All new buttons have names, hover and keyboard focus. The shade uses native dialog focus management, Escape and focus restoration. Prefer 44px controls where space allows; compact widgets use the established dashboard density.

## Do's and Don'ts

- Keep the user's original styling and swipe navigation.
- Reuse the shared runtime for background apps and saved state.
- Do not show fake notifications or infer successful device actions from a click.
- Do not persist secrets, transport instances or PINs in the shared runtime.
