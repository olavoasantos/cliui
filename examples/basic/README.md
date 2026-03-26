# Basic example

Run from the repository root:

```bash
pnpm --dir examples/basic start
```

This example is a focused `ui-input` playground for manually testing the built-in text input component.

## What to test

### Text editing

- type characters into the `Name` and `Email` fields
- backspace and delete should remove characters
- Home/End should jump the cursor
- left/right arrow keys should move the cursor

### Tab navigation

- Tab cycles focus between the four input fields
- the focused field should show a blinking block cursor

### Constraints

- the `Code` field has a 6-character maximum
- the `Readonly` field allows cursor movement but not editing

### Events

- the status bar updates on every keystroke (`input` event)
- tabbing away from `Name` after editing shows a commit message (`change` event)

### Exit

- press `Ctrl+C` to quit
