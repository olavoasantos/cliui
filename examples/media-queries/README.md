# Media Queries & Container Queries Example

Demonstrates responsive terminal UI styling using CSS media queries and container queries.

## Features Shown

### Viewport Media Queries (`@media`)
- **Wide terminal** (≥100 cols): Dashboard uses side-by-side layout
- **Narrow terminal** (<100 cols): Dashboard stacks vertically
- **Short terminal** (≤20 rows): Compact header, footer hidden
- **Portrait orientation**: Status display hidden

### Preference Media Queries
- **`prefers-color-scheme: dark`**: Light text colors (default)
- **`prefers-color-scheme: light`**: Dark text, muted borders
- **`prefers-reduced-motion: reduce`**: Animations disabled

### Container Queries (`@container`)
- **Sidebar** (`container-name: sidebar`): Nav items colored when wide (≥25), hidden when narrow (≤15)
- **Main** (`container-name: main`): Cards show details horizontally when wide (≥50), hide details when narrow (<50)

### Nested Conditions
- `@media (min-width: 120) { @container main (min-width: 60) { ... } }` — card titles turn green on very wide terminals with wide content areas

## Run

```bash
pnpm --filter @examples/media-queries run dev
```

Resize your terminal to see the responsive layout changes in real time. Press `q` to quit.
