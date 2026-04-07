---
"@cliui/elements": minor
---

Restructure component taxonomy with standard HTML tag names

Split the flat `ui-*` namespace into three tiers: HTML elements with standard tag names (`<button>`, `<input>`, `<table>`), unstyled primitives without prefix (`<tabs>`, `<tree>`, `<menu>`), and styled components keeping `ui-*` (`<ui-card>`, `<ui-badge>`). Registration helpers: `registerHTMLElements()`, `registerPrimitives()`, `registerStyledComponents()`, `registerAll()`. Tier 1 and 2 styles inject at user-agent cascade priority.
