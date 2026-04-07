---
"@cliui/terminal": minor
---

Add anchor href to OSC 8 hyperlinks

When the painter encounters an `<a>` element with an href attribute, it sets the hyperlink field on all text cells within that box. Terminal emulators supporting OSC 8 render these as clickable links.
