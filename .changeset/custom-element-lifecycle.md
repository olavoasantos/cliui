---
'@micra/terminal-dom': minor
---

Wire custom element lifecycle callbacks to the terminal DOM. Custom elements now receive `connectedCallback`, `disconnectedCallback`, and `attributeChangedCallback` at the correct times. Implement `CustomElementRegistry.upgrade()` and auto-upgrade on `define()`.
