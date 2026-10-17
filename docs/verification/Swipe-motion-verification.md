# Swipe motion — 17 October 2026

- Replaced the former 300ms generic transition with a scoped 680ms cubic-bezier glide. Incoming panels settle to full size/opacity; outgoing panels recede to 96%/60% opacity. Dragging uses direct track movement with a restrained 98.5% active-panel scale.
- System reduced motion and saved Reduced effects disable the depth and transitions. Browser DOM confirmed system reduced motion is currently true, transition none, opacity 1 and no panel transform. Normal animated appearance could not be visually assessed with that preference enabled; no preference was overridden.
- Real browser verified Home → Apps by horizontal drag and Settings/Home via page controls. Four panels remain mounted and inactive panels remain inert.
- Frontend verify passed: lint, 35 tests, production build, bundle budgets and plugin boundaries. Initial JavaScript 423587 bytes; CSS 77275 bytes.
- Strict root audit still reports only the existing actionless button in the separate display-client web/index.html:25. No changed-file finding.
