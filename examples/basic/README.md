# Basic example

Run from the repository root:

```bash
pnpm --dir examples/basic start
```

This example is now a focused `ui-progress` playground for manually testing the built-in progress component.

## What to test

### Animated progress

- the `Deploy` and `Sync` bars should animate smoothly as their `value` attributes change
- the bar fill should move gradually rather than jump immediately
- the numeric percentage should track the animated visible value

### Default block rendering

- the `Queue` and `Index` bars use the default block preset
- filled and empty segments should look visually closer in height than before
- labels and percentages should render inline with each bar

### Exit

- press `q` or `Ctrl+C` to quit
