---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: fe7e0515290b04070c7aa137e3bf58e6_b42a89036c6511f18805525400d9a7a1
    ReservedCode1: SBBHkxZ/PB0hWppnkW65NHvlOnzTkItcolhN30Cr6hniMmmc0/8a8v21DoGmPDZP5TPvXd/gU8taucjCX61sq5MZEUmIBFlsi55SvDpJYgVSXr3gUYgGktly1a0wA+PGxE1EkwkLOnC3L6YAAimQ/Wt7qs2EdDPtuMk70KnDDgfwTWaK6jZRFW3gY6o=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: fe7e0515290b04070c7aa137e3bf58e6_b42a89036c6511f18805525400d9a7a1
    ReservedCode2: SBBHkxZ/PB0hWppnkW65NHvlOnzTkItcolhN30Cr6hniMmmc0/8a8v21DoGmPDZP5TPvXd/gU8taucjCX61sq5MZEUmIBFlsi55SvDpJYgVSXr3gUYgGktly1a0wA+PGxE1EkwkLOnC3L6YAAimQ/Wt7qs2EdDPtuMk70KnDDgfwTWaK6jZRFW3gY6o=
---

# Fix AI Chat Scroll

- **Status**: closed
- **Type**: bug
- **Blocked by**: None
- **Created**: 2026-06-20

## What to build

AI chat page called `wx.pageScrollTo({ selector: '.typing-indicator' })` after receiving a reply, but the `.typing-indicator` class only exists on the DOM during the sending state. After the reply renders, the selector finds nothing and the page doesn't scroll to the latest message.

## Acceptance criteria

- [x] `ai.js` uses `wx.pageScrollTo({ scrollTop: 99999, duration: 200 })` to reliably scroll to bottom

## Files changed

- `pages/ai/ai.js`
*（内容由AI生成，仅供参考）*
