---
"@cliui/terminal": minor
---

Add synchronized output and frame tearing reduction

Wrap frame output in DEC synchronized update sequences (mode 2026) on terminals that support it. Skip unchanged frames entirely. Reduce frame rate on terminals without synchronized output to minimize visual tearing.
