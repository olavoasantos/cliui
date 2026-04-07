---
"@cliui/terminal": minor
---

Add advanced text layout

Two-phase prepare/layout text measurement architecture. ASCII fast-path to skip cellWidth and Intl.Segmenter for pure-ASCII text. Whitespace normalization aligned with CSS spec. `overflow-wrap`, `word-break`, and `tab-size` CSS property support. Intl.Segmenter word-boundary line breaking for non-ASCII text. Punctuation attachment rules, NBSP, ZWSP, and soft-hyphen handling. URL and numeric run merging.
