# Basic example

Run from the repository root:

```bash
pnpm --dir examples/basic start
```

The start flow rebuilds the library first, then launches the example with `node --import tsx`, so it runs against the latest local implementation without relying on stale build output.

This example is a compact milestone 4 dashboard meant to fit in common terminal sizes while still exercising the new rendering features. The interaction feedback is intentionally condensed into a few status lines so the overlay and scroll demos have more room.

## What to test

### Capability-driven rendering

- the capability line should render with colors immediately on startup
- if your terminal supports synchronized output and advanced color, the renderer now applies those settings without requiring a resize

### Colors + border styles

- the red / green / blue / pink swatches exercise terminal color adaptation
- the `block` and `half-block` tiles exercise the two new built-in border styles

### Built-in custom elements

- the spinner row now uses explicitly registered `<ui-spinner>` elements
- both spinners should animate without owning their own timers
- one spinner uses the default variant and one uses `pulse` with a custom interval

### Absolute positioning + z-index

- click the overlapping `low`, `mid`, and `top` cards
- in overlap regions, the visually topmost card should win hit-testing
- the overlay status line reports which layer received the click

### Overflow scroll

- focus the log pane with `Tab`
- use the mouse wheel over it
- the log viewport should clip and scroll its content
- paste while the log pane is focused to verify paste routing

### General interaction

- `Tab` / `Shift+Tab` cycles focus through the stage, layered cards, and log pane
- typing updates the key line
- resizing updates the resize line
- changing terminal app focus updates the window line
- press `q` to quit
