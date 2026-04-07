---
"@cliui/terminal": minor
---

Add renderer with cell buffer and diff algorithm

Cell buffer representing the terminal screen as a grid of styled cells. Painter that traverses the layout tree and fills cells with text, borders, and backgrounds. Buffer differ that computes minimal changed regions between frames. ANSI writer that emits escape sequences only for changed cells. Frame orchestration that coordinates style → layout → paint → diff → write.
