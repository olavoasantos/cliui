# @cliui/terminal — Design Document

## Context

There is no good framework-agnostic terminal UI library in the JS/TS ecosystem. React Ink exists but is coupled to React and visually limited. Go's Charm ecosystem (Lipgloss, Bubbletea, Bubbles) produces beautiful terminal UIs but is Go-only.

**The idea**: Use a DOM polyfill as the document model, CSS as the styling language, and a custom renderer that paints to the terminal via ANSI escape sequences. Any framework that produces DOM mutations (vanilla JS, Preact, Solid, Vue, Svelte, React, Web Components) works out of the box.

### Key Design Decisions

- **DOM layer**: Fork `@remote-dom/polyfill` into `@cliui/dom`. The original polyfill is ~1500 lines — manageable to own and extend with MutationObserver, CSSStyleDeclaration, Performance API, HTMLDialogElement, and more. [Happy DOM](https://github.com/nicedoc/happy-dom) serves as reference for APIs the polyfill doesn't cover.
- **CSS engine**: Support both inline styles and `<style>` blocks. Full selector matching, specificity, cascade with user-agent and author origins, inheritance, shorthand expansion, CSS custom properties, `@keyframes` animations, CSS transitions, `@media` queries, and `@container` queries.
- **Layout model**: `display: block` is sugar for `display: flex; flex-direction: column`. One layout algorithm (flexbox) to implement, aligned against [Yoga](https://github.com/nicedoc/yoga-layout) for correctness. Text measurement follows [Pretext](https://github.com/nicedoc/pretext)'s two-phase prepare/layout architecture.
- **Web API bridge**: Standard Web APIs (document.title, alert/confirm/prompt, Notification, Clipboard, matchMedia, etc.) map to terminal escape sequences so browser-oriented code works in the terminal.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  User code (vanilla JS, Preact, Solid, Vue, etc.)   │
└──────────────────────┬──────────────────────────────┘
                       │ DOM mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│  DOM Layer                              @cliui/dom  │
│  Forked @remote-dom/polyfill                        │
│  - Element, Document, Node, Text, EventTarget       │
│  - element.style (CSSStyleDeclaration)              │
│  - MutationObserver                                 │
│  - <style> element extraction                       │
│  - Hooks bridge for mutation tracking               │
│  - Performance API                                  │
│  - HTMLDialogElement, HTMLAnchorElement, etc.        │
│  - Web API polyfills (Location, Navigator, etc.)    │
└──────────────────────┬──────────────────────────────┘
                       │ style changes + tree mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│  Style Engine                       @cliui/terminal │
│  - Parse inline styles + <style> blocks             │
│  - Selector matching with specificity + cascade     │
│  - UA stylesheet + author stylesheet origins        │
│  - Inherited value propagation                      │
│  - CSS custom properties (var())                    │
│  - @keyframes animations + CSS transitions          │
│  - @media queries + @container queries              │
│  - Pseudo-classes (:hover, :focus, :active, etc.)   │
└──────────────────────┬──────────────────────────────┘
                       │ computed styles per element
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layout Engine                      @cliui/terminal │
│  - Flexbox (single layout algorithm)                │
│  - Box model (padding, border, margin in cells)     │
│  - Text measurement (grapheme-aware cell widths)    │
│  - Constraint solving (width/height/min/max)        │
│  - Absolute positioning + z-index stacking          │
│  - Overflow scrolling                               │
│  - Advanced line breaking (Intl.Segmenter)          │
└──────────────────────┬──────────────────────────────┘
                       │ layout boxes with positions + sizes
                       ▼
┌─────────────────────────────────────────────────────┐
│  Renderer                           @cliui/terminal │
│  - Paint layout boxes into cell buffer              │
│  - Apply text styling (bold, color, etc.) per cell  │
│  - Apply borders (box-drawing characters)           │
│  - Linear gradients for backgrounds + borders       │
│  - Diff against previous frame                      │
│  - Emit minimal ANSI escape sequences               │
│  - SGR state tracking across frames                 │
└──────────────────────┬──────────────────────────────┘
                       │ ANSI bytes
                       ▼
┌─────────────────────────────────────────────────────┐
│  Terminal                           @cliui/terminal │
│  - Mode management (alt screen, mouse, sync output) │
│  - Input reading (keyboard, mouse, resize)          │
│  - Capability detection (colors, sync output)       │
│  - Input → DOM event dispatch                       │
│  - Caret system (cursor, selection, clipboard)      │
│  - Declarative editable system                      │
│  - Performance instrumentation + vitals             │
│  - Document loading (HTML, CSS, scripts)            │
│  - Web API → terminal escape sequence bridge        │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: DOM (`@cliui/dom`)

### Source

Forked from `@remote-dom/polyfill`, restructured into the project's conventions (`classes/`, `utilities/`, `constants/`, `types/`, `guards/`).

### Core Classes

- **Base**: EventTarget, Event, Node, NodeList, Attr, NamedNodeMap, CharacterData, Text, Comment, DocumentFragment, ParentNode, ChildNode
- **Document model**: Document, Window, Element, HTMLElement, DOMTokenList
- **HTML elements**: HTMLDialogElement (modal, focus trapping), HTMLAnchorElement (tabindex management), HTMLStyleElement, HTMLScriptElement, HTMLLinkElement, HTMLBodyElement, HTMLHeadElement
- **Events**: KeyboardEvent, MouseEvent, WheelEvent, FocusEvent, InputEvent, CustomEvent, ClipboardEvent, TransitionEvent, AnimationEvent, ToggleEvent, ErrorEvent, PromiseRejectionEvent, UIEvent
- **Style**: CSSStyleDeclaration with shorthand expansion and hooks notification
- **Observation**: MutationObserver with batched microtask delivery
- **Performance**: Performance, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceEventTiming, PerformancePaintTiming, LargestContentfulPaint, PerformanceObserver
- **Web APIs**: Location, Navigator, Clipboard, Notification, MediaQueryList
- **Utilities**: parseDocument (full HTML parsing), parseSelector, querySelector/querySelectorAll, cloneNode, expandShorthand, polyfillEnvironment

---

## Layer 2: Style Engine (`@cliui/terminal`)

### CSS Parsing

Hand-written parser supporting:

```
stylesheet  → (rule | at-rule)*
rule        → selector-list '{' declaration* '}'
at-rule     → '@keyframes' name '{' keyframe-block* '}'
            | '@media' condition '{' rule* '}'
            | '@container' [name] condition '{' rule* '}'
            | '@border-style' name '{' declaration* '}'
selector    → simple-selector (combinator simple-selector)*
simple-sel  → element? id? class* attr* pseudo*
combinator  → ' ' | '>' | '+' | '~'
pseudo      → ':' name | ':root'
declaration → property ':' value ';'
```

### Supported CSS Properties

#### Text Styling

| CSS Property            | Terminal Mapping         | Values                                                      |
| ----------------------- | ------------------------ | ----------------------------------------------------------- |
| `color`                 | ANSI foreground          | hex, rgb(), named colors, `inherit`                         |
| `background-color`      | ANSI background          | hex, rgb(), named colors, `linear-gradient()`, `inherit`    |
| `font-weight`           | Bold                     | `bold` / `normal`                                           |
| `font-style`            | Italic                   | `italic` / `normal`                                         |
| `text-decoration`       | Underline / line-through | `underline`, `line-through`, `none`                         |
| `text-decoration-style` | Underline style          | `solid`, `double`, `dotted`, `dashed`, `wavy`               |
| `text-decoration-color` | Underline color          | hex, rgb(), named colors                                    |
| `text-align`            | Horizontal alignment     | `left`, `center`, `right`                                   |
| `vertical-align`        | Vertical alignment       | `top`, `middle`, `bottom`                                   |
| `text-overflow`         | Truncation               | `clip`, `ellipsis`                                          |
| `white-space`           | Wrapping                 | `normal`, `nowrap`, `pre`, `pre-wrap`                       |
| `overflow`              | Content clipping         | `visible`, `hidden`, `scroll`                               |
| `overflow-wrap`         | Break behavior           | `normal`, `break-word`                                      |
| `word-break`            | Word break rules         | `normal`, `break-all`                                       |
| `tab-size`              | Tab width                | number                                                      |
| `opacity`               | Dim/faint                | `0`–`1` (below threshold → ANSI faint)                      |
| `cursor`                | Terminal cursor shape    | `default`, `text`, `pointer`, `wait`, `none`                |

#### Box Model

| CSS Property                  | Terminal Mapping        | Values                                                                                             |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `width` / `height`            | Cell dimensions         | number (cells), `auto`, percentage                                                                 |
| `min-width` / `min-height`    | Minimum cell dimensions | number, percentage                                                                                 |
| `max-width` / `max-height`    | Maximum cell dimensions | number, percentage                                                                                 |
| `padding` (shorthand + sides) | Cell padding            | number (cells)                                                                                     |
| `margin` (shorthand + sides)  | Cell margin             | number (cells), `auto`                                                                             |
| `border-style`                | Box-drawing characters  | `none`, `single`, `rounded`, `double`, `thick`, `block`, `half-block`, `hidden`, `ascii`, custom   |
| `border-color`                | Border foreground color | hex, rgb(), named colors, `linear-gradient()`                                                      |
| `border-width`                | Always 1 cell per side  | Ignored (always 1 when border-style is set)                                                        |
| `box-sizing`                  | Box model mode          | `border-box` (default), `content-box`                                                              |

#### Layout

| CSS Property                      | Terminal Mapping         | Values                                                                              |
| --------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `display`                         | Layout mode              | `flex`, `block` (= flex column), `inline`, `none`                                   |
| `flex-direction`                  | Axis                     | `row`, `column`, `row-reverse`, `column-reverse`                                    |
| `flex-wrap`                       | Wrapping                 | `nowrap`, `wrap`                                                                    |
| `flex-grow` / `flex-shrink`       | Flex sizing              | number                                                                              |
| `flex-basis`                      | Initial size             | number, `auto`, percentage                                                          |
| `flex` (shorthand)                | Flex shorthand           | e.g. `1`, `1 0 auto`, `none`                                                       |
| `gap` / `row-gap` / `column-gap`  | Spacing between children | number (cells)                                                                      |
| `justify-content`                 | Main axis alignment      | `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` |
| `align-items`                     | Cross axis alignment     | `flex-start`, `flex-end`, `center`, `stretch`                                       |
| `align-self`                      | Per-item cross axis      | `auto`, `flex-start`, `flex-end`, `center`, `stretch`                               |
| `position`                        | Positioning              | `relative` (default), `absolute`                                                    |
| `top` / `left`                    | Offset for absolute      | number (cells)                                                                      |
| `z-index`                         | Layer ordering           | number                                                                              |

#### Animations & Transitions

| CSS Property                    | Values                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `transition` (shorthand)        | property duration timing-function delay                        |
| `animation` (shorthand)         | name duration timing-function delay iteration-count direction  |
| `animation-name`                | keyframe name                                                  |
| `animation-duration`            | time value (e.g. `0.3s`, `300ms`)                              |
| `animation-timing-function`     | `linear`, `ease`, `ease-in`, `ease-out`, `cubic-bezier()`, `steps()` |
| `animation-delay`               | time value                                                     |
| `animation-iteration-count`     | number, `infinite`                                             |
| `animation-direction`           | `normal`, `reverse`, `alternate`, `alternate-reverse`          |
| `animation-fill-mode`           | `none`, `forwards`, `backwards`, `both`                        |

#### Container & Media Queries

| CSS Feature                | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| `@media (min-width: N)`    | Terminal width in columns                                      |
| `@media (max-width: N)`    | Terminal width in columns                                      |
| `@media (min-height: N)`   | Terminal height in rows                                        |
| `prefers-color-scheme`     | Evaluates against terminal color scheme                        |
| `prefers-reduced-motion`   | Checks REDUCE_MOTION/NO_MOTION environment variables           |
| `container-type`           | `normal`, `inline-size`, `size`                                |
| `container-name`           | Identifier for container query targeting                       |
| `@container (min-width: N)` | Container width in columns                                    |

#### Custom Properties

| CSS Feature              | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `--*` custom properties  | Declared on any element, inherited by descendants       |
| `var(--name)`            | Resolve custom property value                           |
| `var(--name, fallback)`  | Resolve with fallback                                   |
| `:root` pseudo-selector  | Target the document root for global custom properties   |

#### Custom Border Styles

```css
@border-style my-custom {
  top-left: ╔; top: ═; top-right: ╗;
  left: ║;                right: ║;
  bottom-left: ╚; bottom: ═; bottom-right: ╝;
}

.box { border-style: my-custom; }
```

### Style Resolution Pipeline

```
1. Collect sources
   ├── User-agent stylesheet (built-in defaults for HTML elements)
   ├── Author stylesheets (<style> blocks)
   └── Inline styles (element.style)

2. For each element in the tree:
   a. Find matching rules (selector matching)
   b. Sort declarations by origin + specificity:
      UA < author (element < .class/[attr] < #id) < inline
      (later rules win at equal specificity)
   c. Merge into a single computed declaration map

3. Resolve inheritance
   - Inheritable properties: color, font-weight, font-style,
     text-decoration, text-decoration-style, text-decoration-color,
     text-align, white-space, overflow-wrap, word-break, tab-size
   - Custom properties (--*) always inherit
   - Walk up the tree until a value is found, or use initial value

4. Resolve computed values
   - Percentages → cells (relative to parent content area)
   - `auto` → deferred to layout engine
   - Shorthand expansion (padding: 1 2 → top/bottom: 1, left/right: 2)
   - var() resolution with fallback support

5. Resolve animations and transitions
   - Detect property changes that trigger CSS transitions
   - Resolve @keyframes progress for active animations
   - Interpolate color, numeric, and discrete values
   - Dispatch TransitionEvent / AnimationEvent lifecycle events

6. Resolve conditional rules
   - Evaluate @media conditions against terminal dimensions
   - Evaluate @container conditions with two-pass layout resolution
```

### Pseudo-class Support

| Pseudo-class  | Description                                |
| ------------- | ------------------------------------------ |
| `:hover`      | Mouse is over the element                  |
| `:focus`      | Element has keyboard focus                 |
| `:active`     | Element is being activated (mousedown)     |
| `:disabled`   | Element has disabled attribute             |
| `:checked`    | Element has checked attribute              |
| `:root`       | Matches the document root element          |

### Invalidation

When a mutation occurs (attribute change, class change, style property change, tree change):

1. Mark the affected element (and potentially its subtree) as style-dirty
2. On next frame, recompute styles only for dirty elements
3. If computed styles changed, mark the element as layout-dirty
4. Active animations and transitions tick on every frame for their elements

---

## Layer 3: Layout Engine (`@cliui/terminal`)

### Units

Everything is measured in **terminal cells**. One cell = one monospace character column. Wide characters (CJK, some emoji) occupy 2 cells. Grapheme width is computed using `Intl.Segmenter` and Unicode East Asian Width properties, with an ASCII fast-path for pure-ASCII text.

### Box Model

```
┌─────────────── margin ────────────────┐
│ ┌──────────── border ──────────────┐  │
│ │ ┌────────── padding ──────────┐  │  │
│ │ │                             │  │  │
│ │ │        content area         │  │  │
│ │ │                             │  │  │
│ │ └─────────────────────────────┘  │  │
│ └──────────────────────────────────┘  │
└───────────────────────────────────────┘

border-width is always 1 cell per visible side.
padding and margin are in whole cells.
default box-sizing is border-box.
```

### Flexbox Algorithm

Since `display: block` is `flex-direction: column`, there is one layout algorithm. The implementation is aligned with Yoga's approach for correctness:

1. **Determine available space** from parent content area (or terminal dimensions for root)
2. **Collect flex items** (children with `display` != `none`)
3. **Calculate base sizes**: `flex-basis`, or intrinsic content size if `auto`
4. **Distribute free space** via two-pass flex distribution:
   - First pass: distribute flex-grow (positive free space) and flex-shrink (overflow)
   - Second pass: freeze items constrained by min/max and redistribute remaining space
5. **Floor flex basis** to padding+border so boxes never collapse below their insets
6. **Apply gaps** (`gap` property between items)
7. **Align main axis** (`justify-content`)
8. **Determine cross size** (max cross size of items, or container's explicit size)
9. **Align cross axis** (`align-items`, `align-self`), with stretch re-layout for stretched children
10. **Handle wrapping** if `flex-wrap: wrap` — create flex lines, repeat 3–9 per line
11. **Apply min/max constraints** — clamp results to `min-width`/`max-width`, etc.
12. **FitContent pass** — shrink-wrap containers (absolute/inline in row direction) recompute width after flex sizing

### Text Layout

Text measurement uses a two-phase prepare/layout architecture:

**Prepare phase** (runs once per text change):
- Segment text into grapheme clusters using `Intl.Segmenter`
- Compute cell width per grapheme
- Apply whitespace normalization per CSS spec
- ASCII fast-path skips `Intl.Segmenter` and cellWidth entirely for pure-ASCII text

**Layout phase** (runs on each layout pass):
- Wrap prepared text to fit parent width
- `white-space: normal` — wrap at word boundaries, collapse whitespace
- `white-space: nowrap` — no wrapping, may overflow
- `white-space: pre` — preserve whitespace and newlines, no wrapping
- `white-space: pre-wrap` — preserve whitespace, wrap at parent width with tab stops
- `overflow-wrap: break-word` — break within words when no break opportunity exists
- `word-break: break-all` — break between any characters
- `Intl.Segmenter` word-boundary line breaking for non-ASCII text
- Punctuation attachment rules (CJK kinsoku shori)
- NBSP, ZWSP, and soft-hyphen handling
- URL and numeric run merging to avoid breaking within URLs or numbers

Lines are aligned per `text-align` (left/center/right).

### Absolute Positioning

Elements with `position: absolute` are removed from flex flow. They are positioned relative to their nearest positioned ancestor (or the root) using `top`/`left` offsets. Exempt from parent overflow clipping. Rendered on top of normal flow, respecting `z-index`.

### Overflow Scrolling

Elements with `overflow: scroll`:
- Clip children to the scroll viewport
- Compute scroll height from total content height
- Support mouse wheel-driven vertical scrolling
- Hit-testing respects scroll viewport clipping
- Flex-shrink does not collapse children — they overflow naturally to create scrollable range

### Layout Output

A tree of **layout boxes**:

```ts
interface LayoutBox {
  element: Element;
  x: number;               // margin edge position
  y: number;
  width: number;            // total width (margin + border + padding + content)
  height: number;
  contentX: number;         // content area position
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  computedStyle: ComputedStyle;
  textLines?: string[];
  children: LayoutBox[];
  scrollOffsetY?: number;   // active scroll offset
  scrollHeight?: number;    // total scrollable content height
  zIndex: number;
}
```

---

## Layer 4: Renderer (`@cliui/terminal`)

### Cell Buffer

A 2D grid of cells sized to terminal dimensions:

```ts
interface Cell {
  char: string;
  fg: RGBColor | null;
  bg: RGBColor | null;
  bold: boolean;
  italic: boolean;
  underline: UnderlineStyle;
  underlineColor: RGBColor | null;
  strikethrough: boolean;
  faint: boolean;
  hyperlink: string | null;
}
```

### Paint Pipeline

For each layout box, in z-order (lowest first, stacking z-index propagated to children):

1. **Fill background** — Set `bg` on cells within the box's area. Supports solid colors and `linear-gradient()` with 2D sampling.
2. **Paint borders** — Write box-drawing characters at border positions. Supports `linear-gradient()` for border colors.
   | `border-style` | Characters |
   |---|---|
   | `single` | `┌─┐│└┘` |
   | `rounded` | `╭─╮│╰╯` |
   | `double` | `╔═╗║╚╝` |
   | `thick` | `┏━┓┃┗┛` |
   | `block` | `█████` |
   | `half-block` | `▀▄▌▐▛▜▙▟` |
   | `ascii` | `+-\|` |
   | `hidden` | spaces (preserves spacing) |
   | custom | via `@border-style` at-rules |
3. **Paint text** — Write text graphemes into content area cells, apply fg color, bold, italic, underline, etc. Set hyperlink field for `<a>` elements with href (OSC 8).
4. **Clip** — If `overflow: hidden` or `scroll`, discard cells outside the box's content area. Absolute-positioned elements are exempt from parent clipping.

### Diffing

Compare current cell buffer against previous frame, cell-by-cell. Build a list of changed regions (consecutive changed cells on the same row). Skip unchanged frames entirely.

### ANSI Output

The ANSIWriter tracks SGR state across frames (not just within a frame), so it only emits SGR deltas for attribute changes:

1. Emit cursor-move sequence (`CSI row;col H`)
2. Emit SGR sequences only when attributes differ from current terminal state
3. Write characters
4. On terminal exit, emit SGR reset (`ESC[0m`) to prevent attribute leaks

Color output adapts to the detected terminal color profile (truecolor, 256-color, 16-color, no-color) via color downsampling.

Wrap the entire frame update in synchronized output mode (`CSI ? 2026 h` / `CSI ? 2026 l`) if the terminal supports it, to prevent tearing. Reduce frame rate on terminals without synchronized output.

---

## Layer 5: Terminal (`@cliui/terminal`)

### Mode Management

**On startup:**

- Enter alternate screen buffer (configurable)
- Enable raw mode (disable echo, line buffering, signal processing)
- Hide cursor
- Enable mouse reporting (optional, SGR mode 1006 for extended coordinates)
- Enable focus event reporting (optional, mode 1004)
- Enable bracketed paste (optional, mode 2004)
- Query capabilities: color profile, synchronized output (mode 2026)

**On shutdown (reverse order):**

- Disable bracketed paste, focus events, mouse reporting
- Reset SGR state (`ESC[0m`)
- Show cursor
- Exit alternate screen buffer
- Restore terminal state (cooked mode)

### Input → DOM Events

| Terminal Input    | DOM Event                            | Target                                      |
| ----------------- | ------------------------------------ | ------------------------------------------- |
| Key press         | `KeyboardEvent` (`keydown`)          | `document.activeElement` or `document.body` |
| Mouse click       | `MouseEvent` (`click`)               | Hit-tested element from layout tree         |
| Mouse down/up     | `MouseEvent` (`mousedown`/`mouseup`) | Hit-tested element                          |
| Mouse move        | `MouseEvent` (`mousemove`)           | Hit-tested element                          |
| Mouse wheel       | `WheelEvent` (`wheel`)               | Hit-tested element                          |
| Mouse enter/leave | `MouseEvent`                         | Hit-tested element (for `:hover`)           |
| Resize (SIGWINCH) | `Event` (`resize`)                   | `window` → triggers relayout               |
| Focus/blur        | `FocusEvent`                         | `window`                                    |
| Paste             | `ClipboardEvent` (`paste`)           | `document.activeElement`                    |

**Hit-testing**: Walk layout boxes in reverse z-order, respecting scroll container viewport clipping. Find the topmost box whose bounds contain the mouse coordinates. Return its DOM element.

### Focus Management

- `document.activeElement` tracks the focused element
- Tab / Shift+Tab cycles among elements with `tabindex` attribute
- `focus` and `blur` events dispatched on the target element
- `focusin` / `focusout` bubble to ancestors

### Caret System

Centralized cursor and selection management:

- **Caret** — cursor positioning with blink animation, integrated into the render loop
- **CaretManager** — coordinates carets across editable elements
- **Selection** — Shift+Arrow incremental selection, Shift+click extend, rendered as cell overlays
- **Clipboard** — OSC 52 terminal clipboard with in-memory fallback for copy/cut/paste

### Declarative Editable System

Elements marked with `[contenteditable]` receive:

- Cursor management and keyboard input handling
- Single-line and multi-line rendering modes
- Viewport scrolling for content exceeding element bounds
- Visual line wrapping with cached computation
- Readline keybindings (Ctrl+A/E/K/U/W)

### Performance Instrumentation

- `renderFrame()` emits Performance marks and measures for paint timing
- EventDispatcher captures PerformanceEventTiming entries for input latency
- TerminalVitals utility computes derived metrics: FCP, LCP, CLS, INP, dropped frame percentage

### Web API Bridge

Standard Web APIs mapped to terminal escape sequences:

| Web API                           | Terminal Mapping                                    |
| --------------------------------- | --------------------------------------------------- |
| `document.title` / `<title>`     | OSC 2 window/tab title                              |
| `<a href>`                       | OSC 8 clickable hyperlinks                          |
| `window.alert/confirm/prompt()`  | Async modal `<dialog>` elements                     |
| `Notification` API               | OSC 9 / OSC 777 / BEL desktop notifications         |
| `navigator.clipboard`            | OSC 52 with in-memory fallback                      |
| `window.matchMedia()`            | MediaQueryList with prefers-color-scheme             |
| `window.location.pathname`       | OSC 7 CWD reporting                                 |
| CSS `cursor` property            | Terminal cursor shape changes on focus               |

### Document Loading

HTML files work as first-class entry points:

- Parse full HTML documents (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`)
- Load external stylesheets via `<link rel="stylesheet">`
- Execute scripts in a VM context sharing the terminal's window scope
- Fire document lifecycle events (`DOMContentLoaded`, `load`)
- `Terminal.loadDocument(html)` and `Terminal.loadFile(path)` APIs
- CLI runner: `npx @cliui/terminal <file.html>`

---

## Layer 6: Public API

### Terminal Class

```ts
import {Terminal} from '@cliui/terminal';

const terminal = new Terminal({
  altScreen: true,
  mouse: false,
  fps: 60,
  output: process.stdout,
  input: process.stdin,
});

const doc = terminal.document;

const container = doc.createElement('div');
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.padding = '1';
container.style.borderStyle = 'rounded';
container.style.borderColor = '#7c3aed';

const title = doc.createElement('span');
title.textContent = 'Hello, Terminal!';
title.style.fontWeight = 'bold';
title.style.color = '#7c3aed';

container.appendChild(title);
doc.body.appendChild(container);

await terminal.run();
```

### Side-Effect-Free Entry Point

```ts
import {Terminal, Window} from '@cliui/terminal/core';

const window = new Window();
const terminal = new Terminal({window});
```

### With Stylesheets

```ts
const style = doc.createElement('style');
style.textContent = `
  .container {
    display: flex;
    flex-direction: column;
    padding: 1;
    border-style: rounded;
    border-color: #7c3aed;
  }
  .title {
    font-weight: bold;
    color: #7c3aed;
  }
`;
doc.head.appendChild(style);

const container = doc.createElement('div');
container.className = 'container';

const title = doc.createElement('span');
title.className = 'title';
title.textContent = 'Hello, Terminal!';

container.appendChild(title);
doc.body.appendChild(container);
```

### With HTML

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .container {
      display: flex;
      flex-direction: column;
      padding: 1;
      border-style: rounded;
      border-color: #7c3aed;
    }
  </style>
</head>
<body>
  <div class="container">
    <span style="font-weight: bold; color: #7c3aed">Hello, Terminal!</span>
  </div>
  <script src="./app.js"></script>
</body>
</html>
```

```shell
npx @cliui/terminal index.html
```

### With a Framework (Preact)

```tsx
import {Terminal} from '@cliui/terminal';
import {render} from 'preact';

const terminal = new Terminal();

function App() {
  return (
    <div style={{display: 'flex', borderStyle: 'rounded', padding: 1}}>
      <span style={{fontWeight: 'bold', color: '#7c3aed'}}>Hello from Preact!</span>
    </div>
  );
}

render(<App />, terminal.document.body);
await terminal.run();
```

### With DevTools

```ts
import {Terminal} from '@cliui/terminal';
import {devtools} from '@cliui/devtools';

const terminal = new Terminal({
  plugins: [devtools()],
});

await terminal.run();
// Open the logged URL in Chrome to inspect the terminal UI
```

### Events

```ts
doc.body.addEventListener('keydown', (e) => {
  if (e.key === 'q') terminal.exit();
});

button.addEventListener('click', (e) => {
  // mouse click hit-tested to this element
});

terminal.window.addEventListener('resize', () => {
  // terminal was resized, layout will recompute automatically
});
```

---

## Monorepo Structure

```
cliui/
├── dom/                    # @cliui/dom — standalone DOM polyfill
│   └── src/
│       ├── classes/        # DOM class implementations
│       ├── constants/      # Node types, symbols, internal keys
│       ├── guards/         # Runtime type guards
│       ├── types/          # TypeScript type definitions
│       └── utilities/      # Selector parsing, serialization, etc.
│
├── terminal/               # @cliui/terminal — engine
│   └── src/
│       ├── css/            # Style engine (parser, matcher, resolver, animations)
│       ├── layout/         # Layout engine (flexbox, text measurement)
│       ├── renderer/       # Cell buffer, painter, differ, ANSI writer
│       ├── terminal/       # Terminal I/O (input, events, caret, editable)
│       ├── framework/      # Terminal class, document loading, vitals
│       └── bin/            # CLI runner
│
├── elements/               # @cliui/elements — component library
│   └── src/
│       ├── Button/         # HTML elements (standard tag names)
│       ├── Input/
│       ├── Tabs/           # Primitives (no prefix)
│       ├── Tree/
│       ├── UiCard/         # Styled components (ui-* prefix)
│       ├── UiBadge/
│       └── ...
│
├── devtools/               # @cliui/devtools — Chrome DevTools bridge
│   └── src/
│       ├── classes/        # CDP domain handlers, transport, registry
│       ├── constants/
│       ├── types/
│       └── utilities/
│
├── vite-plugin/            # @cliui/vite-plugin — Vite integration
│   └── src/
│
└── internals/              # @cliui/internals — shared build/test configs (private)
```
