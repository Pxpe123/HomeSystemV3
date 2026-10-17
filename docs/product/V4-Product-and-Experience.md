# HomeSystem V4 — Product and Experience Contract

## Product promise

HomeSystem is a private, local-first household command centre. It gives a household one dependable place to see what matters, control rooms and routines, speak a request, and receive useful—not noisy—updates.

It is designed for a wall tablet first, but the same experience must work in a browser and inside the small Qt display shell on Windows, Linux, and Raspberry Pi.

## Design principles

1. **One-glance clarity.** The first screen answers: what time is it, what needs attention, and what can I do next?
2. **Voice is an accelerator, never a gate.** Every voice command has an equally clear touch path and visible confirmation.
3. **Calm by default.** Urgent events interrupt; ordinary information stays discoverable.
4. **Room-aware control.** Users control meaningful things ("Kitchen lights"), rather than technical entities.
5. **Safe actions earn trust.** Power, locks, alarms, and automations show a clear confirmation and an audit trail.
6. **Private and resilient.** Local functions continue without cloud access; third-party services are optional adapters.

## Primary flows

- **Glance → act:** open Home → choose a room/scene → immediate state feedback.
- **Speak → confirm:** press/hold the assistant button → speak → see interpreted action → confirm when required.
- **Alert → resolve:** tap an urgent card → see source/context → acknowledge or open the related app.
- **Manage:** open Apps → add, hide, or arrange household apps; settings live behind a deliberate entry point.

## Information architecture

| Surface | Purpose | Primary action |
| --- | --- | --- |
| Home | At-a-glance home status | Run a scene or open Assistant |
| Rooms | Devices organised by human space | Toggle/control a device |
| Routines | Time/event based household actions | Run or edit a routine |
| Activity | Alerts and recent important events | Acknowledge or investigate |
| Apps | Extensible integrations | Open an installed app |
| Settings | Household, displays, integrations, privacy | Change configuration |

## Interaction and accessibility requirements

- 8 px spacing rhythm; 48 px minimum touch targets; 16 px minimum body text on tablet.
- Keyboard-visible focus, semantic controls, live status announcements, and reduced-motion support.
- Dark "midnight" surface optimised for low-light rooms. Text and actions meet WCAG 2.2 AA contrast.
- States are designed explicitly: loading skeleton, empty state, offline/degraded connection, success feedback, and recoverable errors.
- No destructive action is one-tap unless it is safely reversible.

## Visual system

- **Ink:** `#0B1020`; **surface:** `#121A2E`; **raised:** `#1B2742`
- **Primary:** `#7C9CFF`; **accent:** `#61D9C2`; **warning:** `#FFB86B`; **danger:** `#FF6B8A`
- **Text:** `#F5F7FF`; **muted:** `#A7B0C6`; **border:** `#2B3A5C`
- Font stack: `Inter, ui-sans-serif, system-ui, sans-serif`; large numerical time uses tabular figures.

## Platform responsibilities

- **Web UI:** presentation, local interaction state, voice capture, optimistic feedback; never owns household truth.
- **Server:** authenticated command gateway, canonical state, event stream, integration adapters, persistence, policy, audit.
- **Agent:** securely reports a machine's capability/telemetry and executes explicitly allowed commands.
- **Qt display:** intentionally thin, kiosk-capable web wrapper with no duplicated application logic.
