# @micra/terminal-dom — Implementation Roadmap

## Project Understanding

**One-liner:** A framework-agnostic terminal UI library that uses a DOM polyfill as its document model, CSS as its styling language, and a custom renderer that paints to the terminal via ANSI escape sequences.

### Purpose & Goals

There is no good framework-agnostic terminal UI library in the JS/TS ecosystem. React Ink is coupled to React; Go's Charm ecosystem is Go-only. This library fills the gap by providing a DOM-based abstraction layer so that any framework that produces DOM mutations (vanilla JS, Preact, Solid, Vue, Web Components) works out of the box.

### Technology Stack

- **Language:** TypeScript (ESM)
- **Runtime:** Node.js (latest LTS — v22)
- **Build:** Vite + vite-plugin-dts
- **Testing:** Vitest (unit + integration + e2e)
- **Linting/Formatting:** oxlint + oxfmt
- **Package manager:** pnpm
- **Runtime dependencies:** Zero (target)

### Key Architectural Decisions

1. **DOM layer** is a fork of `@remote-dom/polyfill` (~30 files in `.ignore/references/polyfill/`), restructured into `src/dom/` following project conventions (`classes/`, `utilities/`, `constants/`, `types/`). The fork is complete — all files including tests are ported and adapted. Happy-dom (`.ignore/references/happy-dom/`) serves as reference for DOM APIs the polyfill doesn't implement (MutationObserver, CSSStyleDeclaration, classList).
2. **One layout algorithm:** Flexbox only. `display: block` is sugar for `flex-direction: column`. `display: inline` is sugar for `flex-direction: row; flex-wrap: wrap`.
3. **CSS engine** is hand-written — parses a defined CSS subset, performs selector matching, specificity/cascade resolution, and inheritance.
4. **Grapheme-aware cell width** is implemented from scratch using a reference codebase (to be cloned into `.ignore/references/`), not an external dependency. Node 22's `Intl.Segmenter` provides native grapheme segmentation.
5. **Cell buffer diffing** minimizes ANSI output — only changed regions are emitted per frame.

### Core Domain Concepts

- **DOM Layer** → document model (Element, Node, Text, Document, etc.)
- **Style Engine** → CSS parsing, selector matching, cascade, inheritance, computed styles
- **Layout Engine** → flexbox algorithm, box model, text measurement/wrapping
- **Renderer** → cell buffer, painting, diffing, ANSI escape sequence generation
- **Terminal** → mode management, raw input parsing, input→DOM event dispatch, capability detection

Each layer feeds into the next in a pipeline: DOM mutations → style computation → layout → paint → ANSI output.

### Constraints & Limitations

- Zero runtime dependencies
- No Shadow DOM, no slots, no form element APIs, no browser globals (window.location, fetch, etc.)
- Border width is always 1 cell per visible side
- All measurements in terminal cells (integer-based)
- `box-sizing: border-box` is the default

### Testing Approach

- **Vitest** for all test levels (unit, integration, e2e)
- Every class, service, utility, hook, and data source gets unit tests
- Existing polyfill tests are ported and adapted during the DOM fork
- E2e tests assert against cell buffer / ANSI output directly

### Documentation

- JSDoc/TSDoc docblocks on every public export, written alongside implementation
- Dedicated documentation phase at the end for higher-level Diataxis docs (tutorials, guides, reference, explanation)

### Known Spikes Needed

- Identify and clone the best reference implementation for grapheme-aware cell width measurement before implementing

### References

All reference codebases live in `.ignore/references/`. Tasks that should draw from a specific reference say so explicitly.

- **Architecture document:** `docs/learn/architecture.md` — the authoritative design document defining the CSS property subset, grammar, layer architecture, and public API.
- **Polyfill source:** `.ignore/references/polyfill/source/` — the `@remote-dom/polyfill` source to fork into `src/dom/`. Contains ~30 TypeScript files: DOM classes, event system, hooks bridge, selectors, serialization, and tests.
- **Happy-dom source:** `.ignore/references/happy-dom/src/` — reference for DOM APIs the polyfill doesn't implement (MutationObserver, CSSStyleDeclaration, classList, DOMTokenList). Full TypeScript DOM implementation with `css/`, `event/`, `mutation-observer/`, and `nodes/` directories.
- **String-width:** `.ignore/references/string-width/` — reference for grapheme-aware terminal cell width measurement. Uses `get-east-asian-width` for character classification, `emoji-regex` for emoji detection, and `strip-ansi` for ANSI stripping (we replace the latter two with `Intl.Segmenter`).
- **Get-east-asian-width:** `.ignore/references/get-east-asian-width/` — zero-dependency Unicode East Asian Width lookup table. Key file: `lookup.js` (code point → width category mapping). Regenerable from Unicode data files.
- **Bubbletea:** `.ignore/references/bubbletea/` — Go terminal UI framework. Key files: `cursed_renderer.go` (cell buffer with differential rendering), `key.go` (keyboard escape sequence parsing), `mouse.go` (mouse event parsing), `raw.go` / `keyboard.go` (terminal mode management), `tea.go` (program lifecycle and render loop).
- **Lipgloss:** `.ignore/references/lipgloss/` — Go terminal styling library. Key files: `borders.go` (8 border styles with character sets), `color.go` (ANSI 16/256/truecolor handling), `blending.go` (color downsampling), `layer.go` (z-order compositing), `align.go` (text alignment).
- **Bubbles:** `.ignore/references/bubbles/` — Go terminal UI component library. Key directories: `spinner/` (~200 LOC, frame-based animation), `progress/` (~300 LOC, animated progress bar with color blending), `textinput/` (single-line input with cursor, Unicode width, paste handling), `viewport/` (scrollable content area).
- **Harmonica:** `.ignore/references/harmonica/` — Go spring physics animation library. Key file: `spring.go` (damped harmonic oscillator). Used by Bubbles' progress bar for smooth animation.
- **Huh:** `.ignore/references/huh/` — Go interactive form library built on Bubbletea/Bubbles/Lipgloss. Key files: `theme.go` (theming system), `field_input.go` (input with validation), `keymap.go` (keybinding system).
- **Glow:** `.ignore/references/glow/` — Real-world Go TUI application (Markdown reader) demonstrating how Bubbletea, Bubbles, Lipgloss, and Harmonica integrate together. Key directory: `ui/` (pager, stash, markdown rendering).

---

## Roadmap

> **Task prefixes:** `T#` = implementation task (deliverable is working, tested code). `S#` = spike/discovery (deliverable is a decision document + follow-up tasks). `C#` = content/design (deliverable is documentation or design asset).

### Phase 0: Project Setup

> Clean up template artifacts and establish the source directory structure.

T1. Remove Playwright and template artifacts: Remove Playwright config, dependency, and e2e script from `package.json`. Verify with `pnpm install && pnpm run check`.

T2. Create source directory structure: Create the module directories (`src/dom/`, `src/css/`, `src/layout/`, `src/renderer/`, `src/terminal/`) with their conventional subdirectories (`classes/`, `types/`, `constants/`, `utilities/` as needed) and barrel `index.ts` files. Verify directories exist and `pnpm run build` succeeds.

### Phase 1: Styled Boxes

> Fork the DOM polyfill, build the style engine, layout engine, renderer, and terminal I/O layer. End result: styled `<div>`s with text, borders, colors, and padding rendering to the terminal with keyboard input.

T3. Port DOM base layer: Port `EventTarget`, `Node`, `NodeList`, `NamedNodeMap`, and `Attr` from `.ignore/references/polyfill/source/` into `src/dom/classes/`, along with constants (`src/dom/constants/`) and types (`src/dom/types/`). Adapt to project conventions (named exports, one class per file). Exclude Shadow DOM, slots, form element APIs, and browser globals (window.location, fetch, etc.) — these are explicitly out of scope per the architecture document. Port and adapt related tests. Verify with `pnpm run test:unit`.

T4. Port DOM tree layer: Port `CharacterData`, `Text`, `Comment`, `DocumentFragment`, `Element`, `ChildNode` mixin, and `ParentNode` mixin from `.ignore/references/polyfill/source/`. These depend on the base layer from T3. Port and adapt related tests. Verify with `pnpm run test:unit`.

T5. Port DOM document and window: Port `Document` and `Window` from `.ignore/references/polyfill/source/` into `src/dom/classes/`. These are the largest classes in the polyfill and depend on T3-T4. Port and adapt related tests. Verify with `pnpm run test:unit`.

T6. Port DOM element subclasses and registry: Port `HTMLElement`, `HTMLBodyElement`, `HTMLHeadElement`, `HTMLHtmlElement`, `HTMLTemplateElement`, `SVGElement`, and `CustomElementRegistry` from `.ignore/references/polyfill/source/` into `src/dom/classes/`. These are ported as part of the complete polyfill fork; `CustomElementRegistry` is wired for custom element features in Phase 5 (T56). Port and adapt related tests. Verify with `pnpm run test:unit`.

T7. Port DOM hooks bridge: Port the hooks system from `.ignore/references/polyfill/source/hooks.ts` into `src/dom/`. The hooks bridge intercepts DOM mutations (insertChild, removeChild, setAttribute, setText, etc.) at the lowest level and provides callback points for external systems to observe changes. It is the foundation for style invalidation (T18), `<style>` element tracking (T13), and MutationObserver (T46). Port and adapt related tests. Verify with `pnpm run test:unit`.

T8. Port DOM event classes: Port `Event`, `CustomEvent`, `FocusEvent`, `ClipboardEvent`, `ErrorEvent`, `PromiseRejectionEvent`, and `ToggleEvent` from `.ignore/references/polyfill/source/` into `src/dom/classes/`. These are ported as part of the complete polyfill fork. Port and adapt tests. Verify with `pnpm run test:unit`. _(parallel with T7)_

T9. Port DOM utilities — selectors: Port `.ignore/references/polyfill/source/selectors.ts` into `src/dom/utilities/`. This provides the low-level single-element `matches(element, selectorString)` function — given one element and one CSS selector string, returns true/false. Also provides selector string parsing into a structured AST. The style engine's `SelectorMatcher` (T15) uses this to iterate rule lists and calculate specificity. Port and adapt the existing test suite (`.ignore/references/polyfill/source/tests/selectors.test.ts`). Verify with `pnpm run test:unit`. _(parallel with T10)_

T10. Port DOM utilities — serialization: Port `.ignore/references/polyfill/source/serialization.ts` (innerHTML parsing + serialization) into `src/dom/utilities/`. Port and adapt the existing test suite (`.ignore/references/polyfill/source/tests/serialization.test.ts`). Verify with `pnpm run test:unit`. _(parallel with T9)_

T11. Add `CSSStyleDeclaration`: Implement `element.style` as a `CSSStyleDeclaration`-like object on Element, supporting the CSS property subset defined in the architecture document (`docs/learn/architecture.md`, Layer 2 tables). Use `.ignore/references/happy-dom/src/css/declaration/` as reference for the CSSStyleDeclaration API shape and property handling. Property setters store values and notify the hooks bridge for style invalidation. Shorthand expansion logic (e.g., `padding: 1 2` → per-side values) is implemented here and shared with the style resolver. Verify with unit tests covering property get/set, shorthand expansion, and camelCase/kebab-case conversion.

T12. Add `className` and `classList`: Implement `element.className` (string property) and `element.classList` (DOMTokenList-like object with `add`, `remove`, `toggle`, `contains`, `replace`). Use `.ignore/references/happy-dom/src/nodes/element/` for `className` and `.ignore/references/happy-dom/src/dom-token-list/` for the `DOMTokenList` implementation as reference. Verify with unit tests. _(parallel with T13)_

T13. Add `<style>` element handling and wire DOM exports: When a `<style>` element is inserted into the document, extract `textContent` and expose it for the style engine. Track insertions, removals, and text changes via the hooks bridge. Also set up `src/dom/index.ts` to export the full public API of the DOM layer (barrel exports depend on T3-T12 being complete; this task runs last in the DOM group). Verify with unit tests asserting style text extraction on insert/remove/update, and `pnpm run build && pnpm run type:check`. _(parallel with T12)_

T14. CSS parser: Implement `CSSParser` in `src/css/classes/` — hand-written parser that takes CSS text and produces a list of rules, where each rule contains a parsed selector AST (reusing the selector parser from T9) and a list of property declarations. Supports the grammar defined in the architecture document (`docs/learn/architecture.md`, Layer 2). Verify with unit tests covering valid CSS, edge cases, and malformed input.

T15. Selector matcher: Implement `SelectorMatcher` in `src/css/classes/` — takes a parsed rule list (from T14) and a DOM element, iterates all rules, uses the `matches()` utility from T9 for per-element matching against each rule's selector AST, calculates specificity scores per matching rule, and returns all matching declarations sorted by specificity. Verify with unit tests covering each selector type, combinator, and specificity ordering.

T16. Style resolver: Implement `StyleResolver` in `src/css/classes/` — takes the matched declarations for an element (from T15) plus inline styles, resolves the cascade (inline > specificity > source order), computes inheritance for inheritable properties (color, font-weight, font-style, text-decoration, text-align, white-space, opacity), and expands shorthands (reusing logic from T11). Percentage values that depend on parent dimensions (e.g., `width: 50%`) are stored as-is and deferred to the layout engine for resolution; only context-free values are resolved here. Produces a `ComputedStyle` map. Verify with unit tests covering specificity ordering, inheritance chains, and shorthand expansion.

T17. Style engine orchestrator: Implement `StyleEngine` in `src/css/classes/` — coordinates the full style pipeline. Collects style sources (inline + `<style>` blocks), triggers selector matching and cascade resolution for dirty elements, manages the computed style cache, and exposes an internal `getComputedStyle(element)` API. Verify with integration tests using a DOM tree with both inline styles and `<style>` blocks.

T18. Style and layout invalidation: Implement dirty-marking on the style engine — when a DOM mutation occurs (attribute change, class change, style property change, tree structure change), mark affected elements as style-dirty via the hooks bridge. On next frame, recompute only dirty elements. When computed styles change, set layout-dirty flags on the affected elements. These flags are consumed by the layout engine (T23) — this task defines the dirty-marking interface, not the layout recomputation itself. Verify with tests asserting that recomputation is scoped to dirty subtrees and that style changes produce layout-dirty marks.

S19. Grapheme width spike: Reference implementations are already cloned: `.ignore/references/string-width/` (string width measurement) and `.ignore/references/get-east-asian-width/` (East Asian Width lookup table). Review both codebases and plan how to combine `Intl.Segmenter` (Node 22 native) for grapheme breaking with the East Asian Width lookup for width classification, replacing `string-width`'s `emoji-regex` and `strip-ansi` dependencies. Deliverable: a decision document on the implementation approach for T20. T20 is blocked on this spike. _(parallel with T14-T18)_

T20. Grapheme width utility: Implement a `cellWidth` utility in `src/layout/utilities/` that measures the terminal cell width of a string using `Intl.Segmenter` for grapheme breaking and East Asian Width data for width classification. Use `.ignore/references/string-width/` for the overall algorithm structure and `.ignore/references/get-east-asian-width/lookup.js` for the code point → width category lookup table. Verify with unit tests covering ASCII, CJK, emoji, combining characters, and zero-width characters.

T21. Text layout: Implement `TextLayout` in `src/layout/classes/` — measures text nodes for width using `cellWidth`, performs word wrapping (`white-space: normal`), and computes text lines. Verify with unit tests covering single-line, multi-line, and wrapping scenarios.

T22. Flexbox column layout and box model: Implement `FlexLayout` in `src/layout/classes/` — computes layout for `display: block` (which is `display: flex; flex-direction: column` per the architecture). Handles the box model (padding, margin, border — border occupies 1 cell per side when `border-style` is not `none`, 0 otherwise), `border-box` sizing, and stacks children vertically. Produces `LayoutBox` output. Verify with unit tests covering nested boxes, padding, margin, and border spacing.

T23. Layout engine orchestrator: Implement `LayoutEngine` in `src/layout/classes/` — takes a DOM tree and computed styles, runs layout from the root (available space = terminal dimensions), resolves layout-dependent percentage values, and produces a nested tree of `LayoutBox` objects. Consumes layout-dirty marks from T18 for incremental re-layout of only affected subtrees. Verify with integration tests using styled DOM trees and asserting correct positions/sizes.

T24. Cell buffer: Implement `CellBuffer` in `src/renderer/classes/` — a 2D grid of `Cell` structs (char, fg, bg, bold, italic, underline style, underline color, strikethrough, faint, hyperlink) sized to terminal dimensions. Supports `get(x, y)`, `set(x, y, cell)`, `resize(cols, rows)`, and `clear()`. See `.ignore/references/bubbletea/cursed_renderer.go` for the cell buffer architecture with "Touched" cell tracking for differential rendering. Verify with unit tests. _(parallel with T25)_

T25. Painter: Implement `Painter` in `src/renderer/classes/` — takes layout boxes and paints them into a cell buffer. Fills backgrounds, draws borders using box-drawing character sets (define `single`, `rounded`, `double`, `thick`, `ascii`, `hidden` mappings in `src/renderer/constants/borders.ts` — see `.ignore/references/lipgloss/borders.go` for the character sets and border rendering patterns), writes text with styling attributes (fg, bg, bold, italic, underline with style/color, strikethrough, faint when computed opacity < 0.5). Verify with unit tests asserting cell buffer contents after painting specific layout boxes. _(parallel with T24)_

T26. Differ: Implement `Differ` in `src/renderer/classes/` — compares two cell buffers cell-by-cell and produces a list of changed regions (consecutive changed cells per row). Verify with unit tests covering no-change, full-change, and sparse-change scenarios.

T27. ANSI writer: Implement `ANSIWriter` in `src/renderer/classes/` — takes a list of changed regions and emits ANSI escape sequences (cursor positioning, SGR attributes including underline style/color and hyperlink OSC 8 sequences, character data). See `.ignore/references/lipgloss/color.go` for ANSI color encoding patterns (16/256/truecolor SGR sequences). Verify with unit tests asserting correct escape sequence output for known cell changes.

T28. Renderer orchestrator: Implement `Renderer` in `src/renderer/classes/` — orchestrates the paint→diff→output pipeline. Holds the current and previous cell buffers, delegates to Painter, Differ, and ANSIWriter. Verify with integration tests.

T29. Terminal mode management: Implement `TerminalManager` in `src/terminal/classes/` — handles entering/exiting alternate screen, raw mode, cursor visibility, focus event reporting (mode 1004), bracketed paste (mode 2004), and cleanup on shutdown (reverse order as specified in the architecture document). See `.ignore/references/bubbletea/raw.go` and `.ignore/references/bubbletea/keyboard.go` for terminal mode setup/teardown patterns, and `.ignore/references/bubbletea/tea.go` for the startup/shutdown sequence. Verify with unit tests mocking stdout and asserting correct escape sequences on start/stop. _(parallel with T30)_

T30. Keyboard input reader: Implement `InputReader` in `src/terminal/classes/` — reads raw bytes from stdin, parses ANSI escape sequences into structured key events (key name, modifiers), and parses bracketed paste sequences into paste data. See `.ignore/references/bubbletea/key.go` for comprehensive keyboard escape sequence parsing (arrow keys, function keys, keypad, modifiers). Verify with unit tests feeding known byte sequences and asserting parsed events. _(parallel with T29)_

T31. Keyboard event dispatcher: Implement `EventDispatcher` in `src/terminal/classes/` — converts parsed key events into DOM `KeyboardEvent` objects (`keydown` followed synchronously by a synthesized `keyup` in the same dispatch cycle, since terminal raw mode cannot distinguish press from release) and dispatches them to `document.body` (active element targeting is added in T45). Converts parsed paste data into `ClipboardEvent` objects and dispatches them. Verify with unit tests asserting correct event dispatch including `keydown`/`keyup` pairing.

T32. Terminal class and render loop: Implement the `Terminal` class in `src/classes/Terminal.ts` — wires together DOM Document, StyleEngine, LayoutEngine, Renderer, TerminalManager, InputReader, and EventDispatcher. Constructor accepts configuration options: `altScreen` (boolean), `mouse` (boolean), `fps` (number), `output` (writable stream), `input` (readable stream). Implements the frame loop: collect mutations → recompute styles → layout → render. Exposes `document`, `window`, `run()`, `exit()`. See `.ignore/references/bubbletea/tea.go` for the program lifecycle pattern (startup → run loop → shutdown) and `.ignore/references/glow/` for how a real application integrates the full stack. Wire `src/index.ts` to export the `Terminal` class and necessary DOM types. Verify with an integration test that creates elements, runs a frame, and asserts ANSI output. Verify exports with `pnpm run build && pnpm run type:check`.

### Phase 2: Flexbox

> Extend layout to support full flexbox capabilities: row direction, flex sizing, alignment, wrapping, and content overflow.

T33. Flex row direction: Extend `FlexLayout` to support `flex-direction: row` and `row-reverse`/`column-reverse`. Verify with unit tests asserting horizontal child layout and reversed ordering.

T34. Flex sizing: Implement `flex-grow`, `flex-shrink`, and `flex-basis` distribution in `FlexLayout`. Verify with unit tests covering positive free space distribution, overflow shrinking, and explicit basis values.

T35. Flex alignment: Implement `justify-content` (all 6 values), `align-items` (4 values), and `align-self` in `FlexLayout`. Verify with unit tests for each alignment value.

T36. Flex gap: Implement `gap`, `row-gap`, and `column-gap` in `FlexLayout`. Verify with unit tests asserting correct spacing between flex items.

T37. Flex wrapping: Implement `flex-wrap: wrap` — create flex lines when items overflow the main axis, repeat sizing and alignment per line. Verify with unit tests covering wrap scenarios with varying item sizes. _(parallel with T38)_

T38. Explicit sizing and constraints: Implement `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`, and percentage resolution (relative to parent content area) in the layout engine. Verify with unit tests covering absolute values, percentages, and min/max clamping. _(parallel with T37)_

T39. Text alignment and wrapping modes: Implement `text-align` (left, center, right), `vertical-align` (top, middle, bottom — controls vertical positioning of text content within its container's content area), `white-space` (normal, nowrap, pre, pre-wrap), and `text-overflow` (clip, ellipsis) in `TextLayout`. Verify with unit tests for each mode.

T40. Content overflow clipping: Implement `overflow: hidden` — clip painted cells outside the element's content area during the paint phase. Verify with unit tests asserting that overflowing content is not present in the cell buffer.

T41. Display none and inline: Implement `display: none` (exclude from layout) and `display: inline` (= flex row with wrap, per architecture). Verify with unit tests.

### Phase 3: Interactivity

> Add mouse input, hit-testing, focus management, MutationObserver, window focus events, and resize handling.

T42. Mouse input parsing: Extend `InputReader` to parse SGR mouse reporting sequences (mode 1006) into structured mouse events (button, position, modifiers, event type). See `.ignore/references/bubbletea/mouse.go` for mouse button enumeration (11 button types) and position tracking patterns. Verify with unit tests feeding known mouse escape sequences.

T43. Hit-testing: Implement hit-testing in `EventDispatcher` — walk layout boxes in reverse document order to find the topmost element at given terminal coordinates. (Z-index ordering is added in Phase 4, T50; until then, later-in-tree elements paint on top.) Verify with unit tests using known layout box positions.

T44. Mouse event dispatch: Convert parsed mouse events into DOM `MouseEvent` and `WheelEvent` objects, hit-test to find the target element, and dispatch with bubbling. Covers `click`, `mousedown`, `mouseup`, `mousemove`, `wheel`. Verify with integration tests.

T45. Focus management: Implement `document.activeElement` tracking, Tab/Shift+Tab cycling among elements with `tabindex`, and `focus`/`blur`/`focusin`/`focusout` event dispatch. Update `EventDispatcher` (T31) to dispatch keyboard and paste events to `document.activeElement` instead of `document.body`. Verify with unit tests covering focus cycling, event dispatch, and keyboard event retargeting.

T46. MutationObserver: Implement a real `MutationObserver` in `src/dom/classes/` — built on the hooks bridge (T7), collects mutations during a microtask and delivers batched `MutationRecord` arrays to observers. Replaces the stub in `.ignore/references/polyfill/source/MutationObserver.ts`. Use `.ignore/references/happy-dom/src/mutation-observer/` as reference for the full MutationObserver API (observe, disconnect, takeRecords) and MutationRecord structure. Verify with unit tests covering `childList`, `attributes`, `characterData` observation, and batched delivery.

T47. Window focus and blur events: Parse terminal focus/blur reporting sequences (mode 1004) in `InputReader`, dispatch `FocusEvent` on `window`. Verify with unit tests feeding known focus/blur escape sequences and asserting event dispatch.

T48. Resize handling: Listen for SIGWINCH, update terminal dimensions, trigger relayout, resize the cell buffer, and dispatch a `resize` event on `window`. Verify with integration tests simulating a resize signal.

### Phase 4: Advanced Rendering

> Add absolute positioning, advanced border styles, scrolling, and terminal capability detection.

T49. Absolute positioning: Implement `position: absolute` in the layout engine — remove from flex flow, position relative to nearest positioned ancestor using `top`/`left` offsets. Verify with unit tests.

T50. Z-index and paint ordering: Implement `z-index` sorting in the paint phase — layout boxes are painted in z-order (lowest first). Update hit-testing (T43) to use z-order instead of document order. See `.ignore/references/lipgloss/layer.go` for z-order compositing patterns. Verify with unit tests asserting correct overlap in the cell buffer.

T51. Block and half-block border styles: Implement `block` and `half-block` border rendering using the appropriate Unicode block characters. See `.ignore/references/lipgloss/borders.go` for the block and half-block character sets (`█▀▄▌▐▛▜▙▟`). Verify with unit tests asserting correct characters in the cell buffer. _(parallel with T49-T50)_

T52. Overflow scroll: Implement `overflow: scroll` — track a scroll offset per element, clip content to the content area, and adjust visible content based on scroll position. No visible scrollbar is rendered (content clipping only). Respond to `wheel` events to update scroll offset. See `.ignore/references/bubbles/viewport/` for scrollable content area patterns with differential rendering. Verify with integration tests.

T53. Terminal capability detection: Query the terminal for color support (truecolor, 256, 16, none), unicode width support (mode 2027), and synchronized output support (mode 2026). Provide graceful degradation. Verify with unit tests mocking terminal responses. _(parallel with T49-T52)_

T54. Synchronized output: Wrap frame updates in synchronized output sequences (`CSI ? 2026 h` / `CSI ? 2026 l`) when the terminal supports it. Verify with unit tests asserting the sequences wrap ANSI output.

T55. Color profile adaptation: Implement color downscaling — map 24-bit RGB to 256-color or 16-color palettes based on detected capability. See `.ignore/references/lipgloss/color.go` for ANSI 16/256/truecolor handling and `.ignore/references/lipgloss/blending.go` for color downsampling algorithms. Verify with unit tests asserting correct color mapping for each profile.

### Phase 5: Ecosystem

> Enable custom elements, provide built-in terminal components, framework adapters, and advanced styling features.

T56. Custom element registration: The `CustomElementRegistry` ported in T6 provides the registration mechanism but lacks integration with the terminal DOM's lifecycle. Wire it so that custom elements receive `connectedCallback` when inserted into the document tree, `disconnectedCallback` when removed, and `attributeChangedCallback` when observed attributes change. Verify with integration tests.

S57. Built-in component design spike: Define the naming strategy, API, behavior, and visual design for the built-in component library. Spinner, progress, and input are the initial proof-of-concept set, but the spike should also define the broader roster needed to make the framework usable by the end of the milestone. Built-ins should use the `ui-*` prefix rather than `terminal-*` or overloaded native HTML tag names. Study `.ignore/references/bubbles/spinner/` (~200 LOC, frame-based animation), `.ignore/references/bubbles/progress/` (~300 LOC, animated bar with color blending), and `.ignore/references/bubbles/textinput/` (cursor management, Unicode width, paste handling) for proven component patterns. Deliverable: component specifications, naming guidance, prioritized roster, and follow-up implementation tasks.

T58. Built-in spinner component: Implement a `<ui-spinner>` custom element with configurable animation frames and interval. See `.ignore/references/bubbles/spinner/` for frame sets (Dot, Jump, Pulse, etc.) and FPS timing patterns. Verify with unit tests asserting frame cycling.

T59. Built-in progress bar component: Implement a `<ui-progress>` custom element with configurable value, max, and visual style. See `.ignore/references/bubbles/progress/` for gradient fill rendering and color blending, and `.ignore/references/harmonica/spring.go` for smooth animation via spring physics. Verify with unit tests.

T60. Built-in text input component: Implement a `<ui-input>` custom element with cursor management, text editing, and `input`/`change` event dispatch. See `.ignore/references/bubbles/textinput/` for cursor positioning, Unicode full-width character handling, paste buffering, and in-place scrolling, and `.ignore/references/huh/field_input.go` for validation and placeholder patterns. Verify with integration tests covering typing, backspace, and cursor movement.

S61. Framework adapter spike: Investigate integration patterns for Preact, Solid, and Vue — determine what adapter code (if any) is needed for each framework to work with the terminal DOM. Deliverable: decision document per framework and follow-up tasks.

T62. Framework examples: Create working example applications in `examples/` demonstrating usage with vanilla JS, Preact, Solid, and Vue. Verify each example runs and renders to the terminal.

T63. Custom border style definitions: Allow users to define custom border character sets and register them as named border styles. See `.ignore/references/lipgloss/borders.go` for the border style registration pattern and character set structure. Verify with unit tests.

T64. Color gradients on borders: Implement gradient color interpolation along border edges. See `.ignore/references/lipgloss/blending.go` for color interpolation algorithms. Verify with unit tests asserting per-cell border color in the cell buffer.

T65. CSS custom properties: Implement `--var` declaration and `var()` resolution in the style engine. Verify with unit tests covering declaration, usage, fallback values, and inheritance.

Post-T65 follow-up tasks from S57 should prioritize `ui-button`, `ui-textarea`, `ui-select`, `ui-details`, `ui-table`, and `ui-codeblock` so the framework ends the milestone with a usable built-in component set beyond the initial proof of concept.

### Phase 6: Documentation

> Write higher-level documentation following the Diataxis framework.

C66. Tutorial — Getting started: Write a step-by-step tutorial covering installation, creating a terminal app, styling elements, and handling keyboard input.

C67. Tutorial — Using with a framework: Write a tutorial demonstrating Preact, Solid, or Vue integration.

C68. How-to guide — Styling: Write a guide covering inline styles, `<style>` blocks, supported CSS properties, the box model, and CSS custom properties.

C69. How-to guide — Layout: Write a guide covering flexbox layout, alignment, wrapping, sizing, and absolute positioning.

C70. How-to guide — Interactivity: Write a guide covering keyboard/mouse events, focus management, scroll, and custom border styles.

C71. How-to guide — Custom elements: Write a guide covering creating and registering custom terminal components.

C72. Reference — CSS property reference: Generate/write a complete reference of all supported CSS properties, their values, and terminal mappings.

C73. Explanation — Architecture overview: Write an explanation doc covering the pipeline architecture, design decisions, and trade-offs.
