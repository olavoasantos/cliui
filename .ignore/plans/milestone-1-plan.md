# Milestone Plan: Milestone 1 — Styled Boxes

## Pre-flight Baseline

`pnpm check` passes cleanly — build, types, lint, format, and 228 unit tests pass.

## Execution Sequence

### Batch 1: M1T1–M1T5 (Complete)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T1 | Port DOM base layer | M0T2 (external, verified) | — | Complete |
| 2 | M1T2 | Port DOM tree layer | M1T1 | — | Complete |
| 3 | M1T3 | Port DOM document and window | M1T1, M1T2 | — | Complete |
| 4 | M1T4 | Port DOM element subclasses and registry | M1T1, M1T2, M1T3 | — | Complete |
| 5 | M1T5 | Port DOM hooks bridge | M1T1, M1T2 | — | Complete |

### Batch 2: M1T6–M1T11 (DOM Additions)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T6 | Port DOM event classes | M1T1 (done) | — | Complete |
| 2a | M1T7 | Port DOM utilities — selectors | M1T1, M1T2 (done) | M1T8 | Complete |
| 2b | M1T8 | Port DOM utilities — serialization | M1T1, M1T2 (done) | M1T7 | Complete |
| 3 | M1T9 | Add CSSStyleDeclaration | M1T2, M1T5 (done) | — | Complete |
| 4 | M1T10 | Add className and classList | M1T2 (done) | — | Complete |
| 5 | M1T11 | Add style element handling + wire DOM exports | M1T1–M1T10 | — | Complete |

## External Dependencies

- M0T2 (Source directory structure): Verified present. All module directories exist under `src/`.
- M1T1–M1T5: All complete per git history (35832cc through fa7f60a).

## Risks

1. M1T6 requires implementing KeyboardEvent and MouseEvent from scratch (not in polyfill)
2. M1T9 shorthand expansion logic must be reusable by the style resolver (M1T14)
3. M1T11 barrel exports depend on all other DOM tasks being complete

### Batch 3: M1T12–M1T15 (Style Engine)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T12 | CSS parser | M1T7 (done) | — | Complete |
| 2 | M1T13 | Selector matcher | M1T7 (done), M1T12 | — | Complete |
| 3 | M1T14 | Style resolver | M1T13 | — | Complete |
| 4 | M1T15 | Style engine orchestrator | M1T11 (done), M1T13, M1T14 | — | Complete |

### Batch 4: M1T16–M1T20 (Invalidation + Layout)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1a | M1T16 | Style and layout invalidation | M1T5, M1T15 (done) | M1T17 | Complete |
| 1b | M1T17 | Grapheme width utility | M0T2 (done) | M1T16 | Complete |
| 2 | M1T18 | Text layout | M1T17 | — | Complete |
| 3 | M1T19 | Flexbox column layout and box model | M1T18 | — | Complete |
| 4 | M1T20 | Layout engine orchestrator | M1T15, M1T16, M1T19 | — | Complete |

### Batch 5: M1T21–M1T22 (Renderer Foundations)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1a | M1T21 | Cell buffer | M0T2 (done) | M1T22 | Complete |
| 1b | M1T22 | Painter | M0T2 (done) | M1T21 | Complete |

### Batch 6: M1T23 (Renderer Diffing)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T23 | Differ | M1T21 (done) | — | Complete |

### Batch 7: M1T24 (ANSI Output)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T24 | ANSI writer | M1T23 (done) | — | Complete |

### Batch 8: M1T25 (Renderer Orchestrator)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T25 | Renderer orchestrator | M1T22, M1T23, M1T24 (done) | — | Complete |

### Batch 9: M1T26 (Terminal Mode Management)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T26 | Terminal mode management | M0T2 (done) | M1T27 | Complete |

### Batch 10: M1T27 (Keyboard Input Reader)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T27 | Keyboard input reader | M0T2 (done) | M1T26 | Complete |

### Batch 11: M1T28 (Keyboard Event Dispatcher)

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1 | M1T28 | Keyboard event dispatcher | M1T3, M1T6, M1T27 (done) | — | Complete |

## Progress Log

- Batch 1 (M1T1–M1T5): Complete. 228 unit tests passing.
- Batch 2 (M1T6–M1T11): Complete. 368 unit tests passing.
  - M1T6: Added UIEvent, KeyboardEvent, MouseEvent, WheelEvent; moved all event init types to types/index.ts
  - M1T7: Extracted selector types to types/index.ts, wrote 30 tests for selectors
  - M1T8: Wrote 16 tests for parseHtml/serializeNode/serializeChildren
  - M1T9: CSSStyleDeclaration with WeakMap storage (Proxy-safe), shorthand expansion, hooks notification
  - M1T10: DOMTokenList with add/remove/toggle/contains/replace; className/classList on Element
  - M1T11: HTMLStyleElement with sheet accessor; DOM barrel exports in src/dom/index.ts
- Batch 3 (M1T12–M1T15): Complete. 462 unit tests passing.
  - M1T12: CSSParser with hand-written tokenizer, comment handling, selector AST reuse
  - M1T13: SelectorMatcher with specificity [a,b,c] tuples, serialization back to strings for DOM matches()
  - M1T14: StyleResolver with cascade, inheritance (9 inheritable props), shorthand expansion via shared expandShorthand()
  - M1T15: StyleEngine orchestrator with WeakMap cache, invalidation API, <style> element collection, computeAll()
- Batch 4 (M1T16–M1T20): Complete. 574 unit tests passing.
  - M1T16: Dirty-marking via hooks bridge (setAttribute, insertChild, removeChild); layout-dirty flags for layout-affecting property changes; detach/unwire support
  - M1T17: cellWidth() with Intl.Segmenter grapheme breaking, East Asian Width lookup (binary search on range tables), emoji detection (ZWJ, flags, skin tones, keycaps), ANSI stripping
  - M1T18: TextLayout with white-space:normal word wrapping, grapheme-level word breaking for overflow, whitespace collapsing
  - M1T19: FlexLayout column layout with box model (padding, margin, border), border-box/content-box sizing, recursive child offset positioning
  - M1T20: LayoutEngine orchestrator with percentage resolution, auto sizing, text measurement, incremental re-layout via dirty flags, WeakMap cache
- Batch 5 (M1T21–M1T22): Complete. 595 unit tests passing.
  - M1T21: Added renderer cell types and `CellBuffer` with cloning semantics, clear/reset behavior, bounds-safe access, and overlap-preserving resize
  - M1T22: Added `Painter` with background fills, phase-1 border rendering, styled text painting, clipping to content bounds, and child-over-parent paint ordering
  - Structural compliance audit passed cleanly for both issues; renderer concerns remain split across types, constants, classes, and 1:1 unit tests
- Batch 6 (M1T23): Complete. 601 unit tests passing.
  - Added `ChangedRegion` and `Differ` for row-local changed-run diffing between buffers
  - Diff logic groups consecutive changed cells on the same row, detects style-only changes, and treats missing cells as empty when dimensions differ
  - Structural compliance audit passed cleanly; diff concerns remain isolated to renderer types, class, and mapped tests
- Batch 7 (M1T24): Complete. 607 unit tests passing.
  - Added `ANSIWriter` for cursor movement, truecolor SGR output, underline style/color encoding, hyperlink OSC 8 transitions, and per-cell style delta emission
  - Writer tracks style state across cells and regions to avoid unnecessary full resets while still emitting required resets for bold/faint, underline, colors, and hyperlinks
  - Structural compliance audit passed cleanly; ANSI output logic remains isolated to a single class with mapped unit tests
- Batch 8 (M1T25): Complete. 612 unit tests and 1 integration test passing.
  - Added `Renderer` to orchestrate paint → diff → ANSI output using double-buffered `CellBuffer` instances
  - Renderer now supports incremental re-rendering, multiple root layout boxes, and buffer resizing while preserving a correct diff baseline
  - Added mapped renderer unit and integration tests for first-frame output, no-op frames, incremental updates, resize behavior, and full styled layout-box rendering
  - Structural compliance audit passed cleanly; orchestration remains isolated to `src/renderer/classes/Renderer.ts` with direct exports from `src/renderer/index.ts`
- Batch 9 (M1T26): Complete. 617 unit tests and 1 integration test passing.
  - Added `TerminalManager` for terminal startup/shutdown sequencing, raw mode toggling, alternate-screen management, cursor visibility, focus reporting, bracketed paste, and optional mouse reporting mode 1006
  - Added explicit terminal-layer public types for input/output stream contracts and manager configuration
  - Added mapped unit tests covering startup order, optional feature flags, reverse-order shutdown, idempotency, and graceful handling of non-raw-capable inputs
  - Structural compliance audit passed cleanly; terminal mode concerns remain isolated to `src/terminal/classes/TerminalManager.ts`, `src/terminal/types/index.ts`, and mapped tests
- Batch 10 (M1T27): Complete. 625 unit tests and 1 integration test passing.
  - Added `InputReader` for buffered raw-byte parsing from readable terminal streams into structured key and paste events
  - Parser now handles printable characters, control keys, arrow/navigation keys, F1–F12, modifier decoding for CSI sequences, Alt-prefixed keys, and bracketed paste buffering
  - Added terminal-layer parsed input event types and mapped unit tests for direct parsing, stream subscription lifecycle, partial escape-sequence buffering, and bracketed paste handling
  - Structural compliance audit passed cleanly; input parsing concerns remain isolated to `src/terminal/classes/InputReader.ts`, `src/terminal/types/index.ts`, and mapped tests
- Batch 11 (M1T28): Complete. 628 unit tests and 1 integration test passing.
  - Added `EventDispatcher` to bridge parsed terminal input events into DOM `KeyboardEvent` and `ClipboardEvent` dispatch on `document.body`
  - Key events now dispatch as synthetic `keydown` followed by `keyup`, while paste events dispatch as `paste` with clipboard text access
  - Added mapped unit tests for modifier/property mapping, dispatch ordering, and paste event targeting
  - Structural compliance audit passed cleanly; dispatch concerns remain isolated to `src/terminal/classes/EventDispatcher.ts` and mapped tests
