# Milestone 14: Media Queries & Container Queries — Issues

## Working Summary

Phase 14 adds responsive styling to terminal-dom via CSS media queries and container queries. Terminal UIs are inherently responsive — terminals come in wildly different sizes (80×24 to 300×80+), and users resize them constantly. Today, the framework relayouts on resize but there's no CSS-level mechanism to express different styles for different sizes. This milestone fills that gap.

**Three groups of work:**

1. **Parser and evaluation foundation (M14T1–M14T3):** Nested at-rule block parsing (shared with M9's `@keyframes` if not already done), media condition parser, and container condition parser.
2. **Media queries (M14T4–M14T5):** Viewport media queries (`min-width`, `max-width`, `min-height`, `max-height`), preference media queries (`prefers-color-scheme`, `prefers-reduced-motion`), and re-evaluation on resize.
3. **Container queries (M14T6–M14T8):** `container-type` / `container-name` properties, `@container` evaluation during layout, and the two-pass style/layout resolution.

**Key context and design decisions:**

- **Units are cells, not pixels.** `@media (min-width: 120)` means "120 columns." No unit conversion needed — terminal-dom's only unit is the cell. This is simpler than browsers.
- **Resize already triggers relayout.** SIGWINCH → `handleResize()` → `markAllDirty()` → `renderFrame()`. Media query re-evaluation hooks into this existing path — when dimensions change, media query matches are re-evaluated, and affected rules are included/excluded from the cascade.
- **Nested at-rule parsing is shared with `@keyframes`.** M9T3 extends the CSS parser for `@keyframes name { from { } to { } }`. `@media` and `@container` have the same structure: `@media condition { rule* }`. If M9 is done first, the parser already handles nested rules. If not, this milestone implements it and M9 reuses it.
- **`window.matchMedia()` from M13T6 is the JavaScript counterpart.** M13 implements `matchMedia` for `prefers-color-scheme` via OSC 11. This milestone extends it to support all media features, and ensures CSS `@media` rules and JS `matchMedia` evaluate the same conditions.
- **Container queries require two-pass resolution.** The container's size must be known before its children's styles can be resolved (since `@container` conditions depend on container dimensions). But the container's size comes from layout, and layout depends on styles. Browsers solve this by:
  1. Resolve the container's own styles and layout (determine its size)
  2. Evaluate `@container` conditions against the resolved size
  3. Resolve children's styles (including container-query-matched rules)
  4. Layout children

  The layout engine already does multiple passes for flex sizing (`flex-grow`/`flex-shrink` distribution). The container query resolution adds another pass layer but follows the same pattern.

- **`container-type: inline-size` only.** Browsers support `inline-size`, `block-size`, and `normal`. For terminal-dom's first pass, `inline-size` (width-based queries) covers the vast majority of use cases. Block-size can be added later.
- **Boolean combinators.** Media conditions support `and`, `or` (comma-separated in CSS), and `not`: `@media (min-width: 80) and (max-height: 40) { }`. Container conditions support the same.
- **`prefers-reduced-motion` checks environment.** Maps to the `REDUCE_MOTION` or `NO_MOTION` environment variable, or a terminal-level setting if detectable. When matched, components can disable animations and transitions.

**Supported media features:**

| Feature                     | Values                    | Source                       |
| --------------------------- | ------------------------- | ---------------------------- |
| `min-width` / `max-width`   | Number (cells)            | Terminal columns             |
| `min-height` / `max-height` | Number (cells)            | Terminal rows                |
| `width` / `height`          | Number (cells)            | Exact match                  |
| `prefers-color-scheme`      | `dark`, `light`           | OSC 11 query (M13T6)         |
| `prefers-reduced-motion`    | `reduce`, `no-preference` | Environment variable         |
| `orientation`               | `landscape`, `portrait`   | `columns > rows` → landscape |

**Supported container features:**

| Feature                     | Values                  | Source                              |
| --------------------------- | ----------------------- | ----------------------------------- |
| `min-width` / `max-width`   | Number (cells)          | Container's resolved content width  |
| `min-height` / `max-height` | Number (cells)          | Container's resolved content height |
| `width` / `height`          | Number (cells)          | Exact match                         |
| `orientation`               | `landscape`, `portrait` | Container dimensions comparison     |

**Example — responsive terminal dashboard:**

```css
.dashboard {
  display: flex;
  gap: 1;
}

/* Wide terminal: side-by-side layout */
@media (min-width: 120) {
  .dashboard {
    flex-direction: row;
  }
  .sidebar {
    width: 30;
  }
  .main {
    flex-grow: 1;
  }
}

/* Narrow terminal: stacked layout */
@media (max-width: 119) {
  .dashboard {
    flex-direction: column;
  }
  .sidebar {
    display: none;
  }
}

/* Short terminal: compact mode */
@media (max-height: 24) {
  .header {
    padding: 0;
    border-style: none;
  }
}

/* Dark terminal theme */
@media (prefers-color-scheme: dark) {
  .app {
    background-color: #1a1a2e;
    color: #e0e0e0;
  }
}
```

**Example — container-responsive component:**

```css
.panel {
  container-type: inline-size;
}

/* Panel is wide enough for horizontal layout */
@container (min-width: 40) {
  .panel-content {
    display: flex;
    flex-direction: row;
    gap: 2;
  }
}

/* Panel is narrow — stack vertically */
@container (max-width: 39) {
  .panel-content {
    display: flex;
    flex-direction: column;
  }
  .panel-detail {
    display: none;
  }
}
```

---

## Issues

### M14T1: Nested at-rule rule parsing

**Summary**

Extend the CSS parser to handle at-rules that contain nested CSS rules (selector + declarations), not just flat declarations. This structure is needed by `@media`, `@container`, and `@keyframes` (M9T3). If M9 is implemented first, this task verifies and extends the existing nested parsing. If not, this task implements it from scratch.

**Expected Outcomes**

- The CSS parser recognizes `@media`, `@container`, and `@keyframes` as at-rules with nested rule bodies
- Nested structure: `@media condition { selector { declarations } selector { declarations } }` — the body contains full CSS rules, not flat declarations
- The `CSSAtRule` type is extended (or a new `CSSConditionalRule` type is added) to hold nested `CSSRule[]` alongside or instead of flat `CSSDeclaration[]`
- Multiple levels of nesting are supported: `@media (min-width: 80) { @container (min-width: 40) { .item { ... } } }` (media wrapping container)
- The existing flat at-rule parsing (`@border-style`, `@keyframes` if already implemented) continues to work
- Unit tests cover: `@media` with nested rules, `@container` with nested rules, mixed flat and nested at-rules, and nested-within-nested

**Dependencies**

- M1T12: CSS parser (being extended)
- M9T3 may have already implemented this for `@keyframes` — coordinate to avoid duplication

---

### M14T2: Media condition parser and evaluator

**Summary**

Implement a parser and evaluator for CSS media conditions. Parses condition expressions like `(min-width: 120)`, `(prefers-color-scheme: dark)`, and boolean combinations with `and`, `or` (comma), and `not`. Evaluates conditions against a set of current media values.

**Expected Outcomes**

- A `parseMediaCondition` utility exists that parses a media condition string into a structured AST
- Supports feature queries: `(feature: value)`, `(min-feature: value)`, `(max-feature: value)`
- Supports boolean combinators: `and`, `not`, and comma-separated alternatives (which mean `or`)
- Supports parenthesized grouping: `not (min-width: 80)`, `(min-width: 80) and (max-height: 40)`
- A `evaluateMediaCondition` utility takes a parsed condition and a `MediaValues` map (`{ width: number, height: number, 'prefers-color-scheme': string, ... }`) and returns `true`/`false`
- Numeric comparisons use cell values (integers)
- Keyword comparisons are exact string matches (`dark`, `light`, `reduce`, `landscape`, etc.)
- `orientation` is computed: `landscape` when `width > height`, `portrait` otherwise
- Types for `MediaCondition` AST and `MediaValues` are defined in `src/css/types/`
- Unit tests cover: each supported feature, min/max comparisons, boolean combinators, `not`, comma-separated alternatives, and invalid/unsupported features (return `false`)

**Dependencies**

- None (standalone parsing/evaluation utility)

---

### M14T3: Container condition parser and evaluator

**Summary**

Implement a parser and evaluator for CSS container conditions. The syntax is identical to media conditions but evaluates against a specific container element's resolved dimensions rather than the viewport.

**Expected Outcomes**

- A `parseContainerCondition` utility exists — reuses or shares implementation with `parseMediaCondition` (the grammar is the same)
- A `evaluateContainerCondition` utility takes a parsed condition and a container's resolved dimensions (`{ width: number, height: number }`) and returns `true`/`false`
- Supports the same features as media queries but scoped to the container: `min-width`, `max-width`, `min-height`, `max-height`, `width`, `height`, `orientation`
- Does NOT support preference features (`prefers-color-scheme`, `prefers-reduced-motion`) — these are viewport-level, not container-level
- Named container targeting: `@container sidebar (min-width: 30)` matches a container with `container-name: sidebar`
- Unit tests cover: width/height conditions against known dimensions, named container matching, and rejection of preference features in container context

**Dependencies**

- M14T2: Media condition parser (shared grammar/implementation)

_Can run in parallel with M14T2._

---

### M14T4: Viewport media queries in the style engine

**Summary**

Wire `@media` rules into the style engine's cascade. When the CSS parser encounters `@media condition { rules }`, the condition is evaluated against current terminal dimensions. Matching rules are included in the cascade; non-matching rules are excluded. On terminal resize, conditions are re-evaluated and affected elements are marked style-dirty.

**Expected Outcomes**

- The style engine processes `@media` at-rules from parsed stylesheets
- During `collectStylesheets()`, each `@media` rule's condition is evaluated against current terminal dimensions (columns × rows) — matching rules are added to `parsedRules`, non-matching rules are excluded
- Terminal dimensions are provided to the style engine (passed from `Terminal` or queried from `TerminalManager`)
- On resize (SIGWINCH), the style engine re-evaluates all media conditions — if any match state changed, affected elements are marked style-dirty and stylesheets are re-collected
- Multiple `@media` rules in one stylesheet work correctly — each independently evaluated
- Nested `@media` rules work: both conditions must match for the inner rules to apply
- `@media` rules interact correctly with specificity — a rule inside `@media` has the same specificity as if it were outside (the `@media` wrapper doesn't add specificity)
- Integration tests verify: rules apply when condition matches, rules don't apply when condition doesn't match, resize triggers re-evaluation, and layout changes reflect new styles

**Dependencies**

- M14T1: Nested at-rule parsing (parser produces nested rules)
- M14T2: Media condition evaluator (evaluates conditions)
- M1T15: StyleEngine (being extended)

---

### M14T5: Preference media queries

**Summary**

Extend media query evaluation to support user preference features: `prefers-color-scheme` and `prefers-reduced-motion`. These connect to the terminal environment detection from M13.

**Expected Outcomes**

- `@media (prefers-color-scheme: dark) { ... }` matches when the terminal has a dark background (detected via OSC 11 from M13T6, or defaulting to `dark` if undetectable)
- `@media (prefers-color-scheme: light) { ... }` matches when the terminal has a light background
- `@media (prefers-reduced-motion: reduce) { ... }` matches when the `REDUCE_MOTION` or `NO_MOTION` environment variable is set, or when the terminal reports a reduced motion preference
- `@media (prefers-reduced-motion: no-preference) { ... }` matches when no reduced motion preference is detected
- Preference values are included in the `MediaValues` map passed to the evaluator
- When `window.matchMedia()` (M13T6) detects a color scheme change, CSS `@media` rules are re-evaluated and affected styles update
- `prefers-reduced-motion: reduce` causes the animation system (M9) to respect `animation: none` and `transition: none` defaults — components can override this explicitly
- Unit tests verify: each preference feature matches correctly, defaults are applied when detection fails
- Integration tests verify: style changes when color scheme changes

**Dependencies**

- M14T4: Viewport media queries (the @media evaluation infrastructure)
- M13T6: Color scheme detection (provides `prefers-color-scheme` value)
- M9T10: Animation frame loop integration (respects `prefers-reduced-motion`)

---

### M14T6: Container query CSS properties

**Summary**

Add `container-type` and `container-name` CSS properties to the supported property subset. These designate an element as a container query container, enabling `@container` rules to evaluate against its dimensions.

**Expected Outcomes**

- `container-type` property added — values: `normal` (default, not a container), `inline-size` (width-based queries), `size` (width and height queries)
- `container-name` property added — values: a custom identifier name, or `none` (default)
- `container` shorthand added — combines `container-type` and `container-name`: `container: sidebar / inline-size`
- Properties are recognized by `CSSStyleDeclaration`, parsed in stylesheets, and propagated through the cascade
- Properties are not inherited (container designation is per-element)
- The style engine tracks which elements have `container-type` set (needed for M14T7's container lookup)
- Unit tests cover: property get/set, shorthand expansion, cascade propagation, and container element tracking

**Dependencies**

- M1T9: CSSStyleDeclaration (property support)
- M1T15: StyleEngine (cascade propagation)

---

### M14T7: Container query resolution in layout

**Summary**

Wire `@container` rules into the style/layout pipeline. This is the most complex task — it requires a two-pass approach where the container's size is resolved first, then its children's styles are computed with container-query-matched rules included.

**Expected Outcomes**

- The style engine processes `@container` at-rules from parsed stylesheets
- During style computation for an element:
  1. Walk up the tree to find the nearest ancestor with `container-type` set (optionally matching `container-name` if the `@container` rule specifies one)
  2. If the container's dimensions are already resolved (from layout), evaluate the `@container` condition
  3. Include matching rules in the cascade for this element
- **Two-pass resolution:**
  1. First pass: compute styles and layout for container elements (determines their sizes)
  2. Second pass: re-compute styles for children of containers where `@container` conditions may now match, then re-layout those subtrees
- The layout engine signals when a container's size is resolved, triggering the second pass for its subtree
- Container-query-affected elements are tracked so only their subtrees are re-computed (not the entire tree)
- Nested containers work: an element can be inside multiple containers, and `@container` rules can target specific named containers
- `@container` rules interact correctly with specificity (same as `@media` — no added specificity)
- Integration tests verify: children restyle when container resizes, named container targeting, nested containers, and performance (only affected subtrees recompute)

**Dependencies**

- M14T1: Nested at-rule parsing
- M14T3: Container condition evaluator
- M14T6: Container CSS properties
- M1T15: StyleEngine (style computation)
- M1T20: LayoutEngine (layout resolution, container size)

---

### M14T8: Container query integration and edge cases

**Summary**

Handle edge cases and ensure container queries integrate cleanly with the rest of the system: `@container` inside `@media`, container queries with animations/transitions, and performance optimization.

**Expected Outcomes**

- `@media` wrapping `@container` works: `@media (min-width: 80) { @container (min-width: 40) { ... } }` — both conditions must match
- `@container` wrapping `@media` works (less common but valid)
- Container queries interact correctly with CSS animations (M9): animated values on container children update when container conditions change
- Container queries interact correctly with CSS transitions (M9): a container resize that changes `@container` match state triggers transitions on children if `transition` is defined
- The differ and renderer handle container-query-triggered relayouts correctly (no visual artifacts from partial updates)
- Performance: container query re-evaluation is scoped to the container's subtree — elements outside the container are not recomputed
- Circular containment is prevented: an element cannot be its own container (container-type elements establish a containment boundary, and their own styles cannot depend on their own `@container` queries)
- Unit tests cover: nested `@media`/`@container`, animation interaction, transition on container resize, circular containment prevention
- Performance benchmarks: compare frame time with and without container queries active, verify overhead is proportional to affected subtree size

**Dependencies**

- M14T7: Container query resolution (the system being hardened)
- M9T9: Style engine animation integration (animation/transition interaction)
- M14T4: Media queries (nesting interaction)

---
