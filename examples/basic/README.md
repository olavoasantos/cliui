# Basic example

Run from the repository root:

```bash
pnpm --dir examples/basic start
```

This example is a compact playground for the features implemented through Milestones 1, 2, and 3.

## What to test

- `Tab` / `Shift+Tab` cycles focus between **Alpha**, **Beta**, and **Paste**
- typing on a focused control updates the key line
- pasting while **Paste** is focused updates the paste line
- clicking controls updates the mouse line
- using the mouse wheel over a control updates the counter-backed mouse line
- changing the observed text triggers `MutationObserver`
- resizing the terminal updates the resize line
- switching terminal focus away and back updates the window line
- press `q` to quit

## Suggested walkthrough

1. Start the example.
2. Press `Tab` a few times.
3. Type a few keys.
4. Focus **Paste** and paste text.
5. Click the controls with the mouse.
6. Use the mouse wheel over any control.
7. Resize the terminal window.
8. Focus another app/window and come back.
9. Press `q` to quit.
