# Vite HMR Example

Demonstrates the `@cliui/vite-plugin` with hot module replacement.

## Running

```bash
cd examples/vite-hmr
pnpm install
pnpm dev
```

## Testing HMR

While the app is running:

1. **CSS hot-reload** — Edit `styles.css` (e.g. change `.header` `border-color` from `#7c3aed` to `#22d3ee`). The terminal re-renders with the new styles without restarting.

2. **HTML full reload** — Edit `index.html` (e.g. change the header text). The terminal clears and reloads the document.

Press `q` to exit.
