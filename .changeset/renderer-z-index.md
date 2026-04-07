---
"@cliui/terminal": minor
---

Add z-index stacking and visual ordering

Flat z-index ordering for paint and hit-testing. Elements with higher z-index paint on top and receive mouse events first. Stacking z-index propagates to children so child elements inherit their parent's stacking context.
