---
'@micra/terminal-dom': minor
---

Centralized caret system for editable components. Cursor rendering, blinking, text selection, and standard editing keybindings are now managed by the Caret/CaretManager infrastructure instead of individual components. UiInput implements the Editable interface and delegates cursor management to the caret system. The renderer applies caret overlays (inverted cell colors) after painting layout boxes.
