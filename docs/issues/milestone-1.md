# Milestone 1: Styled Boxes — Issues

## Working Summary

Phase 1 builds the complete vertical pipeline from DOM to terminal output, scoped to styled boxes with block/column layout. By the end of this milestone, users can create `<div>` elements with text, borders, colors, and padding that render to the terminal, and handle keyboard input via DOM events.

**Six groups of work:**

1. **DOM porting (M1T1–M1T8):** Fork `@remote-dom/polyfill` from `.ignore/references/polyfill/source/` into `src/dom/`, restructured to project conventions. Layered dependency chain with parallelism opportunities.
2. **DOM additions (M1T9–M1T11):** Add `CSSStyleDeclaration`, `className`/`classList`, and `<style>` element handling. These are new implementations using `.ignore/references/happy-dom/` as reference.
3. **Style engine (M1T12–M1T16):** Hand-written CSS parser, selector matching, cascade/inheritance resolution, orchestrator, and dirty-marking invalidation.
4. **Layout (M1T17–M1T20):** Grapheme-aware cell width, text measurement, flexbox column layout with box model, and layout engine orchestrator.
5. **Renderer (M1T21–M1T25):** Cell buffer, painter, cell diffing, ANSI writer, and renderer orchestrator.
6. **Terminal I/O (M1T26–M1T29):** Mode management, keyboard input parsing, keyboard→DOM event dispatch, and the `Terminal` class that wires the full pipeline.

**Key context from the understanding conversation:**

- The DOM porting tasks adapt existing reference code to project conventions — they are not written from scratch.
- S19 (grapheme width spike) from the roadmap is folded into M1T17 since the reference implementations are already cloned and the approach is low-uncertainty.
- Shorthand expansion logic (e.g., `padding: 1 2` → per-side values) is needed by both `CSSStyleDeclaration` (M1T9) and `StyleResolver` (M1T14). Both issues note this shared concern; placement is left to the coding agent.
- Dirty-marking (M1T16) is the designed invalidation mechanism — not a later optimization. The frame loop depends on it.
- `Terminal.run()` starts the frame loop in the background and returns; `exit()` tears it down.
- Terminal mode management (M1T26) enables mouse reporting mode per config even though mouse event consumption is Phase 3.
- Keyboard events dispatch to `document.body` in this phase; active element targeting is added in Phase 3 (M3T4).
- The architecture document (`docs/learn/architecture.md`) is the authoritative reference for the CSS property subset, grammar, layer architecture, and public API.
- Exclusions per the architecture document: no Shadow DOM, no slots, no form element APIs, no browser globals (`window.location`, `fetch`, etc.), no `getComputedStyle()` global.

---

## Issues

### M1T1: Port DOM base layer

**Summary**

Port the foundational DOM classes from `.ignore/references/polyfill/source/` into `src/dom/`: `EventTarget`, `Node`, `NodeList`, `NamedNodeMap`, and `Attr`, along with associated constants and types. These form the base that all other DOM classes depend on. Adapt to project conventions (named exports, one class per file, project directory structure). Exclude Shadow DOM, slots, form element APIs, and browser globals — these are explicitly out of scope per the architecture document.

**Expected Outcomes**

- `EventTarget`, `Node`, `NodeList`, `NamedNodeMap`, and `Attr` classes exist in `src/dom/classes/`, adapted to project conventions
- Associated constants are in `src/dom/constants/` and types in `src/dom/types/`
- Shadow DOM, slots, form element APIs, and browser globals are excluded
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Dependencies**

- M0T2: Source directory structure must exist

---

### M1T2: Port DOM tree layer

**Summary**

Port the tree-level DOM classes that build on the base layer: `CharacterData`, `Text`, `Comment`, `DocumentFragment`, `Element`, and the `ChildNode`/`ParentNode` mixins. These provide the tree manipulation API (appendChild, removeChild, querySelector, etc.) that all higher layers depend on.

**Expected Outcomes**

- `CharacterData`, `Text`, `Comment`, `DocumentFragment`, `Element` classes and `ChildNode`/`ParentNode` mixins exist in `src/dom/classes/`, adapted to project conventions
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Dependencies**

- M1T1: Base layer classes (`EventTarget`, `Node`, etc.) must be in place

---

### M1T3: Port DOM document and window

**Summary**

Port `Document` and `Window` from the polyfill. These are the largest classes in the polyfill and serve as the top-level entry points for the DOM API — `Document` manages element creation, tree root, and query methods; `Window` provides the global event target.

**Expected Outcomes**

- `Document` and `Window` classes exist in `src/dom/classes/`, adapted to project conventions
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Dependencies**

- M1T1: Base layer classes
- M1T2: Tree layer classes (`Element`, `Text`, etc.)

---

### M1T4: Port DOM element subclasses and registry

**Summary**

Port the HTML element subclasses (`HTMLElement`, `HTMLBodyElement`, `HTMLHeadElement`, `HTMLHtmlElement`, `HTMLTemplateElement`, `SVGElement`) and `CustomElementRegistry` from the polyfill. These are ported as part of the complete fork. `CustomElementRegistry` provides the registration mechanism but full custom element lifecycle integration is wired in Phase 5 (M5T1).

**Expected Outcomes**

- All HTML element subclasses and `CustomElementRegistry` exist in `src/dom/classes/`, adapted to project conventions
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Integration Points**

- M5T1 (Phase 5) will wire `CustomElementRegistry` for full custom element lifecycle (`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`)

**Dependencies**

- M1T1: Base layer classes
- M1T2: Tree layer classes
- M1T3: `Document` class (registry is attached to the document)

---

### M1T5: Port DOM hooks bridge

**Summary**

Port the hooks system from the polyfill. The hooks bridge intercepts DOM mutations (insertChild, removeChild, setAttribute, setText, etc.) at the lowest level and provides callback points for external systems to observe changes. It is the foundation for style invalidation (M1T16), `<style>` element tracking (M1T11), and `MutationObserver` (Phase 3, M3T5).

**Expected Outcomes**

- The hooks bridge exists in `src/dom/`, adapted to project conventions
- Callback points are available for external systems to subscribe to DOM mutations
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Integration Points**

- M1T11 (`<style>` element handling) uses hooks to track style element insertions/removals
- M1T16 (style invalidation) uses hooks to trigger dirty-marking on mutations
- M3T5 (`MutationObserver`) uses hooks to collect mutation records

**Dependencies**

- M1T1: Base layer classes
- M1T2: Tree layer classes

*Can run in parallel with M1T6.*

---

### M1T6: Port DOM event classes

**Summary**

Port the event class hierarchy from the polyfill: `Event`, `CustomEvent`, `FocusEvent`, `ClipboardEvent`, `ErrorEvent`, and `PromiseRejectionEvent`. Additionally, implement `KeyboardEvent` and `MouseEvent` as new classes (not present in the polyfill) — these are needed for keyboard input dispatch (M1T28) and mouse event dispatch (Phase 3). Use `.ignore/references/happy-dom/src/event/` as reference for the event class API shapes.

**Expected Outcomes**

- All ported event classes exist in `src/dom/classes/`, adapted to project conventions
- `KeyboardEvent` and `MouseEvent` are implemented as new classes with standard DOM event properties
- Tests are ported and adapted from the polyfill's test suite; new tests cover `KeyboardEvent` and `MouseEvent`
- `pnpm run test:unit` passes for all tests

**Dependencies**

- M1T1: Base layer classes (`EventTarget` for event dispatch)

*Can run in parallel with M1T5.*

---

### M1T7: Port DOM utilities — selectors

**Summary**

Port the selector parsing and matching utility from the polyfill. This provides a `matches(element, selectorString)` function for single-element matching and selector string parsing into a structured AST. The style engine's `SelectorMatcher` (M1T13) builds on this for rule iteration and specificity calculation.

**Expected Outcomes**

- Selector parsing and element matching utility exists in `src/dom/utilities/`
- Supports element, `#id`, `.class`, `[attr]` selectors and combinators (` `, `>`, `+`, `~`)
- Produces a structured selector AST that can be consumed by the style engine
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Integration Points**

- M1T13 (SelectorMatcher) uses the selector AST and matching function

**Dependencies**

- M1T1: Base layer classes
- M1T2: Tree layer classes (`Element` for matching)

*Can run in parallel with M1T8.*

---

### M1T8: Port DOM utilities — serialization

**Summary**

Port the innerHTML parsing and serialization utility from the polyfill. This provides `innerHTML` get/set functionality on elements.

**Expected Outcomes**

- Serialization utility exists in `src/dom/utilities/`
- Tests are ported and adapted from the polyfill's test suite
- `pnpm run test:unit` passes for all ported tests

**Dependencies**

- M1T1: Base layer classes
- M1T2: Tree layer classes

*Can run in parallel with M1T7.*

---

### M1T9: Add CSSStyleDeclaration

**Summary**

Implement `element.style` as a `CSSStyleDeclaration`-like object on `Element`, supporting the CSS property subset defined in the architecture document (Layer 2 tables). Property setters store values and notify the hooks bridge for style invalidation. This also implements shorthand expansion logic (e.g., `padding: 1 2` → per-side values, `margin` shorthand, `border` shorthand) which is a shared concern with the style resolver (M1T14).

**Expected Outcomes**

- Every `Element` instance has a `.style` property that is a `CSSStyleDeclaration`-like object
- Supports get/set for all CSS properties in the architecture document's property tables (text styling, box model, layout)
- Supports both camelCase (`paddingTop`) and kebab-case (`padding-top`) property access
- Shorthand properties expand to their longhand equivalents
- Property changes notify the hooks bridge (enabling style invalidation in M1T16)
- Unit tests cover property get/set, shorthand expansion, camelCase/kebab-case conversion, and hooks notification

**Integration Points**

- M1T14 (StyleResolver) reuses the shorthand expansion logic
- M1T16 (style invalidation) listens for style property changes via the hooks bridge

**Dependencies**

- M1T2: `Element` class must exist
- M1T5: Hooks bridge must be in place for mutation notification

**Technical Constraints**

- Use `.ignore/references/happy-dom/src/css/declaration/` as reference for the `CSSStyleDeclaration` API shape
- Only the CSS property subset defined in the architecture document needs to be supported

---

### M1T10: Add className and classList

**Summary**

Implement `element.className` (string property) and `element.classList` (DOMTokenList-like object with `add`, `remove`, `toggle`, `contains`, `replace`) on `Element`. These enable CSS class-based selectors, which the style engine depends on for selector matching.

**Expected Outcomes**

- `element.className` gets/sets the class attribute as a space-separated string
- `element.classList` provides a DOMTokenList-like API (`add`, `remove`, `toggle`, `contains`, `replace`)
- Changes to `className` and `classList` are reflected in each other and in the element's `class` attribute
- Unit tests cover all DOMTokenList operations and synchronization between `className`, `classList`, and the `class` attribute

**Dependencies**

- M1T2: `Element` class must exist

*Can run in parallel with M1T11.*

---

### M1T11: Add style element handling and wire DOM exports

**Summary**

Implement `<style>` element tracking: when a `<style>` element is inserted into the document, extract its `textContent` and expose it for the style engine to consume. Track insertions, removals, and text content changes via the hooks bridge. Also set up `src/dom/index.ts` to export the full public API of the DOM layer (this task runs last in the DOM group since barrel exports depend on M1T1–M1T10 being complete).

**Expected Outcomes**

- When a `<style>` element is inserted into the document, its CSS text is extractable by the style engine
- Insertions, removals, and text content changes to `<style>` elements are tracked and observable
- `src/dom/index.ts` exports the full public DOM API
- Unit tests assert style text extraction on insert, remove, and text update
- `pnpm run build && pnpm run type:check` passes

**Integration Points**

- M1T15 (StyleEngine) consumes the extracted CSS text from `<style>` elements

**Dependencies**

- M1T2: Tree layer classes
- M1T5: Hooks bridge for tracking mutations
- M1T1–M1T10: All DOM classes must be complete before wiring barrel exports

*Style element tracking can run in parallel with M1T10. Barrel exports run last.*

---

### M1T12: CSS parser

**Summary**

Implement a hand-written CSS parser that takes CSS text and produces a list of rules. Each rule contains a parsed selector AST (reusing the selector parser from M1T7) and a list of property declarations. The parser supports the grammar defined in the architecture document: `stylesheet → rule*`, `rule → selector-list '{' declaration* '}'`, with support for all four combinators and the full property subset.

**Expected Outcomes**

- `CSSParser` class exists in `src/css/classes/`
- Accepts CSS text and produces a structured list of rules with parsed selector ASTs and declaration lists
- Reuses the selector parser from M1T7 for selector AST generation
- Handles the full CSS grammar subset defined in the architecture document
- Gracefully handles malformed input (no crashes, best-effort parsing or clear error)
- Unit tests cover valid CSS with various selector types, multiple rules, edge cases, and malformed input

**Dependencies**

- M1T7: Selector parsing utility (for reuse of selector AST generation)

---

### M1T13: Selector matcher

**Summary**

Implement selector matching that takes a parsed rule list and a DOM element, iterates all rules, determines which selectors match the element, calculates specificity scores, and returns all matching declarations sorted by specificity. This bridges the CSS parser output and the style resolver input.

**Expected Outcomes**

- `SelectorMatcher` class exists in `src/css/classes/`
- Given a rule list and an element, returns all matching declarations sorted by specificity
- Specificity calculation follows standard CSS rules: inline style > `#id` > `.class`/`[attr]` > element; later rules win at equal specificity
- Uses the `matches()` utility from M1T7 for per-element selector evaluation
- Unit tests cover each selector type (element, id, class, attribute), all combinators, and specificity ordering edge cases

**Dependencies**

- M1T7: Selector matching utility (`matches()` function)
- M1T12: CSS parser (produces the rule list input)

---

### M1T14: Style resolver

**Summary**

Implement cascade resolution that takes matched declarations for an element (from M1T13) plus inline styles, resolves the cascade (inline > specificity > source order), computes inheritance for inheritable properties, and expands shorthands. Produces a `ComputedStyle` map per element.

**Expected Outcomes**

- `StyleResolver` class exists in `src/css/classes/`
- Resolves the cascade: inline styles take highest priority, then specificity, then source order
- Computes inheritance for inheritable properties: `color`, `font-weight`, `font-style`, `text-decoration`, `text-align`, `white-space`, `opacity`
- Expands shorthand properties (reusing logic from M1T9)
- Percentage values that depend on parent dimensions are stored as-is and deferred to the layout engine
- Produces a `ComputedStyle` map
- Unit tests cover specificity ordering, inheritance chains, shorthand expansion, and percentage deferral

**Integration Points**

- M1T9 (CSSStyleDeclaration) shares shorthand expansion logic — the coding agent decides where this shared code lives

**Dependencies**

- M1T13: Selector matcher (provides matched declarations)

---

### M1T15: Style engine orchestrator

**Summary**

Implement the top-level style engine that coordinates the full style pipeline: collect style sources (inline styles + `<style>` blocks), trigger selector matching and cascade resolution for dirty elements, manage the computed style cache, and expose an internal `getComputedStyle(element)` API for the layout engine to consume.

**Expected Outcomes**

- `StyleEngine` class exists in `src/css/classes/`
- Collects CSS from `<style>` elements (via M1T11) and inline styles
- Coordinates selector matching (M1T13) and cascade resolution (M1T14) for elements
- Manages a computed style cache
- Exposes an internal `getComputedStyle(element)` API (not a DOM global — per architecture document)
- Integration tests verify the full pipeline using a DOM tree with both inline styles and `<style>` blocks

**Dependencies**

- M1T11: `<style>` element handling (CSS source extraction)
- M1T13: Selector matcher
- M1T14: Style resolver

---

### M1T16: Style and layout invalidation

**Summary**

Implement dirty-marking on the style engine: when a DOM mutation occurs (attribute change, class change, style property change, tree structure change), mark affected elements as style-dirty via the hooks bridge. On the next frame, only dirty elements are recomputed. When computed styles change, set layout-dirty flags on the affected elements. These layout-dirty flags define the interface consumed by the layout engine (M1T20) — this task defines the dirty-marking mechanism, not the layout recomputation itself.

**Expected Outcomes**

- DOM mutations trigger style-dirty marks on affected elements (and potentially their subtrees)
- Style recomputation is scoped to dirty elements only
- When computed styles change as a result of recomputation, layout-dirty flags are set on those elements
- The layout-dirty interface is defined and ready for the layout engine to consume
- Tests verify that recomputation is scoped to dirty subtrees and that style changes produce layout-dirty marks

**Integration Points**

- M1T5 (hooks bridge) provides the mutation observation mechanism
- M1T15 (StyleEngine) is extended with dirty-tracking behavior
- M1T20 (LayoutEngine) consumes layout-dirty flags

**Dependencies**

- M1T5: Hooks bridge
- M1T15: Style engine orchestrator

---

### M1T17: Grapheme width utility

**Summary**

Implement a cell width measurement utility that determines the terminal cell width of a string. Uses `Intl.Segmenter` (Node 22 native) for grapheme breaking and East Asian Width data for width classification. This replaces `string-width`'s dependencies on `emoji-regex` and `strip-ansi` with native APIs, keeping the project at zero runtime dependencies.

Before implementing, review the reference codebases (`.ignore/references/string-width/` for the overall algorithm and `.ignore/references/get-east-asian-width/` for the width lookup table) to determine the best approach for combining these into a single utility.

**Expected Outcomes**

- A `cellWidth` utility exists in `src/layout/utilities/`
- Correctly measures terminal cell width for: ASCII text (1 cell each), CJK characters (2 cells each), emoji (varies — typically 2 cells), combining characters (0 cells), zero-width characters (0 cells)
- Uses `Intl.Segmenter` for grapheme segmentation — no external dependencies
- Uses East Asian Width data for width classification
- Unit tests cover ASCII, CJK, emoji, combining characters, zero-width characters, and mixed strings

**Technical Constraints**

- Zero runtime dependencies — `Intl.Segmenter` is native to Node 22
- Reference implementations: `.ignore/references/string-width/` (algorithm structure), `.ignore/references/get-east-asian-width/lookup.js` (code point → width category mapping)

**Dependencies**

- M0T2: Source directory structure (`src/layout/utilities/` must exist)

*Can run in parallel with the style engine group (M1T12–M1T16).*

---

### M1T18: Text layout

**Summary**

Implement text measurement and word wrapping. Measures text nodes for width using the `cellWidth` utility and performs word wrapping for `white-space: normal` mode. Produces an array of text lines ready for the layout engine to position. Additional `white-space` modes (`nowrap`, `pre`, `pre-wrap`) and `text-align`/`text-overflow` are added in Phase 2.

**Expected Outcomes**

- `TextLayout` class exists in `src/layout/classes/`
- Measures text node width using `cellWidth` (M1T17)
- Performs word wrapping at word boundaries to fit within a given available width (`white-space: normal`)
- Produces an array of text lines with their measured widths
- Other `white-space` modes are deferred to Phase 2
- Unit tests cover single-line text, multi-line text, and wrapping at various widths

**Edge Cases**

- Words longer than the available width (should break at the width boundary)
- Empty text nodes
- Text containing wide characters (CJK, emoji) near the wrap boundary

**Dependencies**

- M1T17: Grapheme width utility (`cellWidth`)

---

### M1T19: Flexbox column layout and box model

**Summary**

Implement the flexbox column layout algorithm and box model. Since `display: block` is `display: flex; flex-direction: column` per the architecture, this task implements the single layout algorithm that Phase 1 uses: vertically stacking children within a container, accounting for padding, margin, border spacing, and `border-box` sizing. Phase 2 extends this with row direction, `flex-grow`/`flex-shrink`, `gap`, alignment (`justify-content`, `align-items`), and wrapping.

**Expected Outcomes**

- `FlexLayout` class exists in `src/layout/classes/`
- Computes layout for `display: block` / `flex-direction: column`: children stacked vertically
- Implements the box model: padding, margin (in cells), border (1 cell per side when `border-style` is not `none`, 0 otherwise)
- Default `box-sizing: border-box` — border and padding are included in the element's specified width/height
- Produces `LayoutBox` output as defined in the architecture document (position, dimensions, content area, computed style, text lines, children, z-index)
- Phase 2 concerns are out of scope: `flex-direction: row`, `flex-grow`/`flex-shrink`/`flex-basis`, `gap`, `justify-content`, `align-items`/`align-self`, `flex-wrap`, explicit `width`/`height`/`min-*`/`max-*` with percentages, `display: none`/`inline`
- Unit tests cover nested boxes, padding, margin, border spacing, and `border-box` vs `content-box` sizing

**Dependencies**

- M1T18: Text layout (for measuring text content to determine intrinsic sizes)

---

### M1T20: Layout engine orchestrator

**Summary**

Implement the top-level layout engine that takes a DOM tree and computed styles, runs layout from the root element (available space = terminal dimensions), resolves layout-dependent values (percentages relative to parent content area, `auto` values), and produces a nested tree of `LayoutBox` objects. Consumes layout-dirty marks from M1T16 for incremental re-layout of only affected subtrees.

**Expected Outcomes**

- `LayoutEngine` class exists in `src/layout/classes/`
- Takes a DOM tree root and computed styles (from the style engine), produces a `LayoutBox` tree
- Root available space is the terminal dimensions (columns × rows)
- Resolves percentage values relative to parent content area
- Resolves `auto` values for width/height based on content
- Consumes layout-dirty flags to re-layout only affected subtrees
- Integration tests verify correct positions and sizes using styled DOM trees

**Dependencies**

- M1T15: Style engine orchestrator (provides computed styles)
- M1T16: Style and layout invalidation (provides layout-dirty flags)
- M1T19: Flexbox column layout and box model

---

### M1T21: Cell buffer

**Summary**

Implement the 2D cell grid that represents the terminal screen. Each cell holds a character and its visual attributes (foreground/background color, bold, italic, underline style and color, strikethrough, faint, hyperlink). The buffer is sized to terminal dimensions and provides the surface that the painter writes to and the differ reads from.

**Expected Outcomes**

- `CellBuffer` class exists in `src/renderer/classes/`
- Represents a 2D grid of cells, each containing: character, foreground color, background color, bold, italic, underline style, underline color, strikethrough, faint, hyperlink
- Supports `get(x, y)`, `set(x, y, cell)`, `resize(cols, rows)`, and `clear()` operations
- Sized to terminal dimensions (columns × rows)
- Unit tests cover all operations including boundary conditions

**Dependencies**

- M0T2: Source directory structure (`src/renderer/classes/` must exist)

*Can run in parallel with M1T22.*

---

### M1T22: Painter

**Summary**

Implement the paint phase that takes layout boxes and writes their visual representation into a cell buffer. This covers background fills, border drawing using box-drawing character sets, and text rendering with styling attributes.

**Expected Outcomes**

- `Painter` class exists in `src/renderer/classes/`
- Paints layout boxes into a cell buffer in the correct order
- Fills background colors within box areas
- Draws borders using box-drawing character sets for Phase 1 border styles: `single`, `rounded`, `double`, `thick`, `ascii`, `hidden`
- Border character set mappings are defined as constants (corners, horizontal/vertical edges for each style)
- Writes text with styling attributes: foreground color, background color, bold, italic, underline (with style and color), strikethrough, faint (when computed opacity is below a threshold — see architecture document)
- Unit tests assert cell buffer contents after painting specific layout boxes

**Integration Points**

- Border character sets should reference `.ignore/references/lipgloss/borders.go` for proven character mappings
- `block` and `half-block` border styles are deferred to Phase 4

**Dependencies**

- M0T2: Source directory structure (`src/renderer/classes/` must exist)

*Can run in parallel with M1T21 — both need the Cell type definition, which can be established early. The Renderer orchestrator (M1T25) integrates them.*

---

### M1T23: Differ

**Summary**

Implement cell-by-cell diffing between two cell buffers to produce a minimal list of changed regions. Each changed region represents a run of consecutive changed cells on a single row. This minimizes the amount of ANSI output needed per frame.

**Expected Outcomes**

- `Differ` class exists in `src/renderer/classes/`
- Compares two cell buffers cell-by-cell
- Produces a list of changed regions (consecutive changed cells per row)
- Unit tests cover: no changes (identical buffers), full change (completely different buffers), sparse changes (scattered individual cell changes), and row-spanning changes

**Dependencies**

- M1T21: Cell buffer (provides the buffers to compare)

---

### M1T24: ANSI writer

**Summary**

Implement ANSI escape sequence generation that takes a list of changed regions and emits the terminal control sequences needed to update those cells: cursor positioning, SGR (Select Graphic Rendition) attributes for text styling, underline style and color sequences, hyperlink OSC 8 sequences, and character data.

**Expected Outcomes**

- `ANSIWriter` class exists in `src/renderer/classes/`
- Emits cursor positioning sequences (`CSI row;col H`) to move to changed regions
- Emits SGR sequences for: foreground color, background color, bold, italic, underline (with style and color), strikethrough, faint
- Emits hyperlink sequences (OSC 8)
- Resets SGR attributes efficiently when they change between cells
- Unit tests assert correct escape sequence output for known cell changes

**Technical Constraints**

- Phase 1 targets truecolor (24-bit RGB) output. Color downscaling to 256/16 color palettes is added in Phase 4.
- Reference: `.ignore/references/lipgloss/color.go` for ANSI color encoding patterns

**Dependencies**

- M1T23: Differ (produces the changed regions input)

---

### M1T25: Renderer orchestrator

**Summary**

Implement the top-level renderer that orchestrates the paint→diff→output pipeline. Manages the current and previous cell buffers, delegates painting to the Painter, diffing to the Differ, and ANSI output to the ANSIWriter.

**Expected Outcomes**

- `Renderer` class exists in `src/renderer/classes/`
- Orchestrates the full render pipeline: paint layout boxes → diff against previous frame → emit ANSI sequences
- Manages current and previous cell buffers (swaps after each frame)
- Handles buffer resizing when terminal dimensions change
- Integration tests verify the full pipeline from layout boxes to ANSI output

**Dependencies**

- M1T22: Painter
- M1T23: Differ
- M1T24: ANSI writer

---

### M1T26: Terminal mode management

**Summary**

Implement terminal mode setup and teardown. On startup, configure the terminal for TUI operation (alternate screen, raw mode, cursor hiding, mouse reporting, focus events, bracketed paste). On shutdown, reverse all mode changes to restore the terminal to its original state.

**Expected Outcomes**

- `TerminalManager` class exists in `src/terminal/classes/`
- Startup sequence: enter alternate screen buffer (configurable), enable raw mode, hide cursor, enable mouse reporting (SGR mode 1006, configurable), enable focus event reporting (mode 1004), enable bracketed paste (mode 2004)
- Shutdown sequence: reverse order — disable bracketed paste, disable focus events, disable mouse reporting, show cursor, exit alternate screen, restore cooked mode
- Mouse reporting is enabled when configured, even though mouse event consumption is Phase 3
- Unit tests mock stdout and assert correct escape sequences on startup and shutdown

**Technical Constraints**

- Reference: `.ignore/references/bubbletea/raw.go`, `.ignore/references/bubbletea/keyboard.go` for mode setup/teardown patterns, `.ignore/references/bubbletea/tea.go` for startup/shutdown sequencing

**Dependencies**

- M0T2: Source directory structure (`src/terminal/classes/` must exist)

*Can run in parallel with M1T27.*

---

### M1T27: Keyboard input reader

**Summary**

Implement raw byte reading from stdin and parsing of ANSI escape sequences into structured key events. This covers standard key presses, arrow keys, function keys, modifier combinations, and bracketed paste sequences.

**Expected Outcomes**

- `InputReader` class exists in `src/terminal/classes/`
- Reads raw bytes from a readable stream (stdin)
- Parses ANSI escape sequences into structured key events (key name, modifiers: ctrl, alt, shift)
- Handles: printable characters, arrow keys, function keys (F1–F12), Home/End/PageUp/PageDown, Enter, Tab, Escape, Backspace, Delete
- Parses bracketed paste sequences into paste data
- Unit tests feed known byte sequences and assert correctly parsed key events

**Technical Constraints**

- Reference: `.ignore/references/bubbletea/key.go` for comprehensive keyboard escape sequence parsing

**Dependencies**

- M0T2: Source directory structure (`src/terminal/classes/` must exist)

*Can run in parallel with M1T26.*

---

### M1T28: Keyboard event dispatcher

**Summary**

Implement the bridge from parsed key events to DOM events. Converts structured key events into DOM `KeyboardEvent` objects and dispatches them. Since terminal raw mode cannot distinguish key press from release, each key event produces a `keydown` followed synchronously by a synthesized `keyup` in the same dispatch cycle. Also converts parsed paste data into `ClipboardEvent` objects.

**Expected Outcomes**

- `EventDispatcher` class exists in `src/terminal/classes/`
- Converts parsed key events into DOM `KeyboardEvent` objects with correct properties (`key`, `code`, `ctrlKey`, `altKey`, `shiftKey`, etc.)
- Dispatches `keydown` followed by a synthesized `keyup` for each key event
- Converts parsed paste data into DOM `ClipboardEvent` objects and dispatches them
- Dispatches all keyboard and paste events to `document.body` (active element targeting is added in Phase 3, M3T4)
- Unit tests assert correct event creation, property mapping, `keydown`/`keyup` pairing, and dispatch target

**Dependencies**

- M1T3: Document and Window classes (dispatch target is `document.body`)
- M1T6: DOM event classes (`KeyboardEvent`, `ClipboardEvent`)
- M1T27: Keyboard input reader (produces structured key events)

---

### M1T29: Terminal class and render loop

**Summary**

Implement the `Terminal` class that wires together the entire pipeline: DOM Document, StyleEngine, LayoutEngine, Renderer, TerminalManager, InputReader, and EventDispatcher. This is the public entry point for the library. The constructor accepts configuration options, and `run()` starts the frame loop in the background (collecting mutations → recomputing styles → layout → render) then returns. `exit()` tears down the loop and restores the terminal.

**Expected Outcomes**

- `Terminal` class exists in `src/classes/Terminal.ts`
- Constructor accepts configuration: `altScreen` (boolean), `mouse` (boolean), `fps` (number), `output` (writable stream), `input` (readable stream)
- Exposes `document` (DOM Document instance), `window` (Window instance)
- `run()` is async — it initializes the terminal (via TerminalManager), starts the frame loop in the background, and returns once initialization is complete. The frame loop runs at the configured FPS: recompute dirty styles → re-layout dirty subtrees → render changed cells
- `exit()` stops the frame loop and performs terminal cleanup (via TerminalManager)
- `src/index.ts` exports the `Terminal` class and necessary DOM types
- Integration test creates elements, runs a frame, and asserts ANSI output
- `pnpm run build && pnpm run type:check` passes

**Dependencies**

- M1T3: Document and Window classes
- M1T15: StyleEngine
- M1T16: Style and layout invalidation
- M1T20: LayoutEngine
- M1T25: Renderer
- M1T26: TerminalManager
- M1T28: EventDispatcher

---
