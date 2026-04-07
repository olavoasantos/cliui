---
"@cliui/terminal": minor
---

Add custom element lifecycle wiring

CustomElementRegistry integration with the terminal DOM lifecycle. Custom elements receive `connectedCallback` on insertion, `disconnectedCallback` on removal, and `attributeChangedCallback` for observed attribute changes. Late registration handled via `upgrade()` with auto-upgrade of existing document elements on `define()`.
