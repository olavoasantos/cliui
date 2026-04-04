# CSS Animations Example

Live demo of `@keyframes` animations with various configurations.

## Running

```bash
pnpm dev
```

## What it shows

| Demo | @keyframes | Duration | Config |
|---|---|---|---|
| Color Pulse | `pulse` | 2s | `ease-in-out infinite` |
| Fade In/Out | `fadeInOut` | 1.5s | `linear infinite` |
| Width Slide | `slideWidth` | 2s | `ease-in-out infinite alternate` |
| Rainbow Text | `rainbow` | 3s | `linear infinite` (6 color stops) |
| Border Cycle | `borderCycle` | 2s | `ease infinite` |
| Multi-Animation | `pulse` + `fadeInOut` | 2s / 3s | Two animations on one element |

Press individual keys to toggle each animation on/off. Press `A` to toggle all.

## Features demonstrated

- `@keyframes` with `from`/`to` and percentage stops
- Multiple stops (rainbow has 7 color stops)
- `animation-direction: alternate` (width bounces)
- `animation-iteration-count: infinite`
- Multiple comma-separated animations on one element
- Color, number (cell), and opacity interpolation
- Animation lifecycle events (`animationstart`, `animationend`, `animationiteration`)
