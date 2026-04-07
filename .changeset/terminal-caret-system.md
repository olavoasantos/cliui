---
"@cliui/terminal": minor
---

Add caret system with selection and clipboard

Centralized CaretManager and Caret classes for cursor positioning, blink animation, and text selection. Selection ranges render as cell overlays with configurable highlight colors. Clipboard support via OSC 52 (terminal clipboard) with in-memory fallback. Copy, cut, and paste operations. Shift+click to extend selection. Shift+Arrow for incremental selection.
