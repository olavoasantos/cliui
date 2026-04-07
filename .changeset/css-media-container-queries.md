---
"@cliui/terminal": minor
---

Add media queries and container queries

`@media` rules evaluating against terminal dimensions in cells (e.g., `min-width: 120` means 120 columns). Re-evaluates on terminal resize. Preference queries: `prefers-color-scheme` evaluates against terminal color scheme, `prefers-reduced-motion` checks environment variables. `@container` queries with `container-type`, `container-name`, and `container` shorthand properties. Two-pass style/layout resolution where container size is resolved first, then children's styles recompute against matched container rules. Nested at-rule parsing shared with the keyframes parser.
