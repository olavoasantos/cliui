# Milestone 2: Flexbox — Issues

## Working Summary

Phase 2 extends the layout engine built in Phase 1 to support full flexbox capabilities. Phase 1 established `display: block` (flex column) with the box model. This milestone adds row direction, flex sizing (grow/shrink/basis), alignment, gap, wrapping, explicit sizing with constraints, additional text layout modes, content overflow clipping, and `display: none`/`inline`.

All tasks in this milestone extend existing classes from Phase 1 — primarily `FlexLayout` (M1T19), `TextLayout` (M1T18), `LayoutEngine` (M1T20), and `Painter` (M1T22). No new architectural layers are introduced.

**Key context:**

- The architecture document defines `display: block` as `flex-direction: column` and `display: inline` as `flex-direction: row; flex-wrap: wrap`. There is one layout algorithm (flexbox) — this milestone completes it.
- The flexbox algorithm steps in the architecture document (steps 1–10) describe the full algorithm. Phase 1 implemented steps 1–2 and basic step 3 for column direction. This milestone completes all steps.
- `vertical-align` in this project controls vertical positioning of text content within its container's content area — it is not the CSS `vertical-align` for inline boxes.
- `overflow: hidden` is implemented in the paint phase (clipping), not in the layout phase.
- The architecture document (`docs/learn/architecture.md`) remains the authoritative reference for property values and behavior.

---

## Issues

### M2T1: Flex row direction

**Summary**

Extend `FlexLayout` to support `flex-direction: row`, `row-reverse`, and `column-reverse`. Phase 1 implemented column direction only. This adds horizontal layout and reversed ordering for both axes, completing the four flex direction modes.

**Expected Outcomes**

- `FlexLayout` supports all four `flex-direction` values: `row`, `column`, `row-reverse`, `column-reverse`
- Row direction lays out children horizontally, distributing available width
- Reversed directions render children in reverse order
- Unit tests verify horizontal child layout and reversed ordering for both axes

**Dependencies**

- M1T19: Flexbox column layout and box model (the base being extended)

---

### M2T2: Flex sizing

**Summary**

Implement `flex-grow`, `flex-shrink`, and `flex-basis` distribution in `FlexLayout`. These control how flex items share available space (positive free space via `flex-grow`) or handle overflow (negative free space via `flex-shrink`), and what their initial size is before distribution (`flex-basis`).

**Expected Outcomes**

- `flex-grow` distributes positive free space proportionally among items with `flex-grow > 0`
- `flex-shrink` reduces item sizes proportionally when total item sizes exceed available space
- `flex-basis` sets the initial main size of a flex item before grow/shrink distribution; `auto` falls back to the item's intrinsic content size
- Unit tests cover: positive free space distribution, overflow shrinking, explicit basis values, mixed grow/shrink ratios, and items with `flex-grow: 0` / `flex-shrink: 0`

**Dependencies**

- M2T1: Flex row direction (grow/shrink apply on both axes, so row direction should be in place)

---

### M2T3: Flex alignment

**Summary**

Implement main-axis and cross-axis alignment in `FlexLayout`: `justify-content` (6 values), `align-items` (4 values), and `align-self` (per-item override).

**Expected Outcomes**

- `justify-content` distributes items along the main axis: `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly`
- `align-items` aligns items along the cross axis: `flex-start`, `flex-end`, `center`, `stretch`
- `align-self` overrides `align-items` for individual items: `auto` (inherit from parent's `align-items`), `flex-start`, `flex-end`, `center`, `stretch`
- Unit tests verify each alignment value for both row and column directions

**Dependencies**

- M2T1: Flex row direction (alignment applies on both axes)

---

### M2T4: Flex gap

**Summary**

Implement `gap`, `row-gap`, and `column-gap` in `FlexLayout`. These add fixed spacing between flex items without affecting the first/last item's position relative to the container edges.

**Expected Outcomes**

- `gap` sets both `row-gap` and `column-gap` simultaneously
- `row-gap` adds vertical spacing between rows of items (between flex lines when wrapping)
- `column-gap` adds horizontal spacing between columns of items
- Gap space is accounted for before grow/shrink distribution
- Unit tests verify correct spacing between flex items for row and column directions

**Dependencies**

- M2T1: Flex row direction (gap applies on both axes)

---

### M2T5: Flex wrapping

**Summary**

Implement `flex-wrap: wrap` in `FlexLayout`. When flex items overflow the main axis, create multiple flex lines and repeat sizing and alignment per line. This completes the flexbox algorithm's wrapping behavior.

**Expected Outcomes**

- `flex-wrap: wrap` creates new flex lines when items exceed the container's main axis size
- Each flex line independently handles sizing (grow/shrink) and alignment
- `row-gap` applies between flex lines
- Cross-axis size is determined by the tallest/widest item per line (or the container's explicit size)
- Unit tests cover: items wrapping to multiple lines, varying item sizes causing uneven lines, interaction with gap and alignment

**Dependencies**

- M2T2: Flex sizing (wrap interacts with grow/shrink per line)
- M2T3: Flex alignment (alignment applies per line)
- M2T4: Flex gap (row-gap applies between lines)

_Can run in parallel with M2T6._

---

### M2T6: Explicit sizing and constraints

**Summary**

Implement explicit sizing properties (`width`, `height`) and constraints (`min-width`, `min-height`, `max-width`, `max-height`) in the layout engine, including percentage resolution relative to the parent content area.

**Expected Outcomes**

- `width` and `height` set explicit dimensions on elements (in cells or percentages)
- `min-width`/`min-height` set minimum size floors
- `max-width`/`max-height` set maximum size ceilings
- Percentage values resolve relative to the parent's content area dimensions
- Constraints are applied after flex sizing — grow/shrink results are clamped to min/max
- Unit tests cover: absolute cell values, percentage values, min/max clamping, and interaction with flex sizing

**Dependencies**

- M2T2: Flex sizing (constraints interact with grow/shrink distribution)

_Can run in parallel with M2T5._

---

### M2T7: Text alignment and wrapping modes

**Summary**

Extend `TextLayout` to support the full set of text layout properties: `text-align` (horizontal alignment within the content area), `vertical-align` (vertical positioning of text within its container), all `white-space` modes, and `text-overflow` for truncation. Phase 1 implemented only `white-space: normal`.

**Expected Outcomes**

- `text-align`: `left` (default), `center`, `right` — aligns text lines within the element's content area width
- `vertical-align`: `top` (default), `middle`, `bottom` — positions text content vertically within the container's content area
- `white-space: nowrap` — no wrapping, text may overflow
- `white-space: pre` — preserves whitespace and newlines, no wrapping
- `white-space: pre-wrap` — preserves whitespace, wraps at container width
- `text-overflow: clip` (default) — overflowing text is simply cut off
- `text-overflow: ellipsis` — overflowing text is truncated with an ellipsis character
- Unit tests cover each mode individually and in combination

**Dependencies**

- M1T18: Text layout (the base being extended)

---

### M2T8: Content overflow clipping

**Summary**

Implement `overflow: hidden` in the paint phase. When an element has `overflow: hidden`, any painted cells that fall outside the element's content area are discarded. This prevents child content from visually overflowing its container.

**Expected Outcomes**

- Elements with `overflow: hidden` clip child content to their content area during painting
- Cells outside the element's content area are discarded
- Nested overflow containers each clip to their own content area
- Unit tests assert that overflowing content is absent from the cell buffer when `overflow: hidden` is set

**Dependencies**

- M1T22: Painter (clipping is applied during the paint phase)

---

### M2T9: Display none and inline

**Summary**

Implement `display: none` and `display: inline` in the layout engine. `display: none` excludes an element and its subtree from layout entirely. `display: inline` is syntactic sugar for `flex-direction: row; flex-wrap: wrap` per the architecture document, enabling inline-flow-like behavior within the flexbox model.

**Expected Outcomes**

- `display: none` excludes the element from layout — it occupies no space and its children are not laid out
- `display: inline` behaves as `flex-direction: row; flex-wrap: wrap`
- Toggling `display` between `none` and a visible value triggers relayout via dirty-marking
- Unit tests cover: elements hidden with `display: none` occupy no space, `display: inline` wraps children horizontally

**Dependencies**

- M2T1: Flex row direction (`display: inline` needs row support)
- M2T5: Flex wrapping (`display: inline` needs wrap support)

---
