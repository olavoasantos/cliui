# CSS Transitions Example

Interactive demo of CSS transitions — state-driven visual changes that interpolate smoothly.

## Running

```bash
pnpm dev
```

## What it shows

| Demo | Property | Duration | Easing |
|---|---|---|---|
| Color transition | `background-color`, `color` | 500ms | `ease` |
| Width transition | `width` | 400ms | `ease-in-out` |
| Opacity transition | `opacity` | 600ms | `ease` |
| Multi-property | `background-color`, `color`, `width` | 300ms / 500ms | `ease` / `ease-in-out` |

Press keys to toggle states. Transitions interpolate smoothly between old and new values.
Transition lifecycle events (`transitionrun`, `transitionstart`, `transitionend`) are logged live.

## Features demonstrated

- `transition` shorthand with multiple properties
- Color interpolation (RGB lerp)
- Cell-based number interpolation (width — integer steps)
- Continuous number interpolation (opacity — smooth)
- Different easing functions per property
- Mid-transition reversal (press a key while transitioning)
