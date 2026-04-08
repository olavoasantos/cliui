# @cliui/terminal — Design Document

## Context

There is no good framework-agnostic terminal UI library in the JS/TS ecosystem. React Ink exists but is coupled to React and visually limited. Go's Charm ecosystem (lipgloss, bubbletea, bubbles) produces beautiful terminal UIs but is Go-only.

**The idea**: Use a DOM polyfill as the document model, CSS as the styling language, and a custom renderer that paints to the terminal via ANSI escape sequences. Any framework that produces DOM mutations (vanilla JS, Preact, Solid, Vue, Web Components) works out of the box.

### Key Design Decisions

- **DOM layer**: Fork `@remote-dom/polyfill` into `src/dom/`. MutationObserver is a stub and there's no style property — we need deep modifications. ~1500 lines, manageable to own.
- **CSS engine**: Support both inline styles and `<style>` blocks from day one. Full selector matching, specificity, and cascade.
- **Layout model**: `display: block` is sugar for `display: flex; flex-direction: column`. One layout algorithm (flexbox) to implement.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  User code (vanilla JS, Preact, Solid, Vue, etc.)   │
└──────────────────────┬──────────────────────────────┘
                       │ DOM mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│  DOM Layer                                          │
│  Forked @remote-dom/polyfill (src/dom/)             │
│  - Element, Document, Node, Text, EventTarget       │
│  - element.style (CSSStyleDeclaration)              │
│  - MutationObserver (real implementation)            │
│  - <style> element extraction                       │
│  - Hooks bridge for mutation tracking               │
└──────────────────────┬──────────────────────────────┘
                       │ style changes + tree mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│  Style Engine                                       │
│  - Parse inline styles + <style> blocks             │
│  - Selector matching                                │
│  - Specificity + cascade resolution                 │
│  - Inherited value propagation                      │
│  - Terminal-specific property mapping               │
└──────────────────────┬──────────────────────────────┘
                       │ computed styles per element
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layout Engine                                      │
│  - Flexbox (single layout algorithm)                │
│  - Box model (padding, border, margin in cells)     │
│  - Text measurement (grapheme-aware cell widths)    │
│  - Constraint solving (width/height/min/max)        │
└──────────────────────┬──────────────────────────────┘
                       │ layout boxes with positions + sizes
                       ▼
┌─────────────────────────────────────────────────────┐
│  Renderer                                           │
│  - Paint layout boxes into cell buffer              │
│  - Apply text styling (bold, color, etc.) per cell  │
│  - Apply borders (box-drawing characters)           │
│  - Diff against previous frame                      │
│  - Emit minimal ANSI escape sequences               │
└──────────────────────┬──────────────────────────────┘
                       │ ANSI bytes
                       ▼
┌─────────────────────────────────────────────────────┐
│  Terminal                                           │
│  - Mode management (alt screen, mouse, sync output) │
│  - Input reading (keyboard, mouse, resize)          │
│  - Capability detection (colors, unicode width)     │
│  - Input → DOM event dispatch                       │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: DOM

### Source

Fork `@remote-dom/polyfill` into `src/dom/`, restructured to match the project's conventions (`classes/`, `utilities/`, `constants/`, `types/`). The polyfill is ~1500 lines across ~30 files. We own and modify directly. For any DOM APIs we need that the polyfill doesn't implement (e.g., `MutationObserver`, `CSSStyleDeclaration`, `classList`), use [Happy DOM](https://github.com/nicedoc/happy-dom)'s source as reference.

### What to add

**`element.style`** — A `CSSStyleDeclaration`-like object on every Element. Property setters store values and schedule a style invalidation. Only supports the CSS subset defined below.

```ts
el.style.color = '#7c3aed';
el.style.borderStyle = 'rounded';
el.style.padding = '1 2';
```

**`MutationObserver`** — Replace the stub. Built on top of the polyfill's Hooks system (which already intercepts insertChild, removeChild, setAttribute, setText, etc.). Collects mutations during a microtask and delivers batched `MutationRecord` arrays to observers.

**`<style>` element** — When a `<style>` element is inserted into the document, extract `textContent` and feed it to the style engine. Track insertions, removals, and text changes.

**`element.className` / `element.classList`** — For CSS class-based selectors.

### What NOT to add

- No `getComputedStyle()` global — computed styles live in an internal map managed by the style engine.
- No `window.location`, `history`, `fetch`, or other browser APIs.
- No Shadow DOM, no slots.
- No form element APIs (`HTMLInputElement.value`, etc.) — interaction handled via events.

---

## Layer 2: Style Engine

### CSS Parsing

Hand-written parser for our CSS subset. The grammar is small:

```
stylesheet  → rule*
rule        → selector-list '{' declaration* '}'
selector    → simple-selector (combinator simple-selector)*
simple-sel  → element? id? class* attr*
combinator  → ' ' | '>' | '+' | '~'
declaration → property ':' value ';'
```

Reuse the selector matching logic already in `@remote-dom/polyfill`'s `selectors.ts` (supports element, #id, .class, [attr], combinators).

### Supported CSS Properties

#### Text Styling

| CSS Property            | Terminal Mapping         | Values                                        |
| ----------------------- | ------------------------ | --------------------------------------------- |
| `color`                 | ANSI foreground          | hex, rgb(), named colors, `inherit`           |
| `background-color`      | ANSI background          | hex, rgb(), named colors, `inherit`           |
| `font-weight`           | Bold                     | `bold` / `normal`                             |
| `font-style`            | Italic                   | `italic` / `normal`                           |
| `text-decoration`       | Underline / line-through | `underline`, `line-through`, `none`           |
| `text-decoration-style` | Underline style          | `solid`, `double`, `dotted`, `dashed`, `wavy` |
| `text-decoration-color` | Underline color          | hex, rgb(), named colors                      |
| `text-align`            | Horizontal alignment     | `left`, `center`, `right`                     |
| `vertical-align`        | Vertical alignment       | `top`, `middle`, `bottom`                     |
| `text-overflow`         | Truncation               | `clip`, `ellipsis`                            |
| `white-space`           | Wrapping                 | `normal`, `nowrap`, `pre`, `pre-wrap`         |
| `overflow`              | Content clipping         | `visible`, `hidden`, `scroll`                 |
| `opacity`               | Dim/faint                | `0`–`1` (below threshold → ANSI faint)        |

#### Box Model

| CSS Property                  | Terminal Mapping        | Values                                                                                   |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `width` / `height`            | Cell dimensions         | number (cells), `auto`, percentage                                                       |
| `min-width` / `min-height`    | Minimum cell dimensions | number, percentage                                                                       |
| `max-width` / `max-height`    | Maximum cell dimensions | number, percentage                                                                       |
| `padding` (shorthand + sides) | Cell padding            | number (cells)                                                                           |
| `margin` (shorthand + sides)  | Cell margin             | number (cells), `auto`                                                                   |
| `border-style`                | Box-drawing characters  | `none`, `single`, `rounded`, `double`, `thick`, `block`, `half-block`, `hidden`, `ascii` |
| `border-color`                | Border foreground color | hex, rgb(), named colors                                                                 |
| `border-width`                | Always 1 cell per side  | Ignored (always 1 when border-style is set)                                              |
| `box-sizing`                  | Box model mode          | `border-box` (default), `content-box`                                                    |

#### Layout

| CSS Property                     | Terminal Mapping         | Values                                                                              |
| -------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `display`                        | Layout mode              | `flex`, `block` (= flex column), `inline`, `none`                                   |
| `flex-direction`                 | Axis                     | `row`, `column`, `row-reverse`, `column-reverse`                                    |
| `flex-wrap`                      | Wrapping                 | `nowrap`, `wrap`                                                                    |
| `flex-grow` / `flex-shrink`      | Flex sizing              | number                                                                              |
| `flex-basis`                     | Initial size             | number, `auto`, percentage                                                          |
| `gap` / `row-gap` / `column-gap` | Spacing between children | number (cells)                                                                      |
| `justify-content`                | Main axis alignment      | `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` |
| `align-items`                    | Cross axis alignment     | `flex-start`, `flex-end`, `center`, `stretch`                                       |
| `align-self`                     | Per-item cross axis      | `auto`, `flex-start`, `flex-end`, `center`, `stretch`                               |
| `position`                       | Positioning              | `relative` (default), `absolute`                                                    |
| `top` / `left`                   | Offset for absolute      | number (cells)                                                                      |
| `z-index`                        | Layer ordering           | number                                                                              |

### Style Resolution Pipeline

```
1. Collect sources
   ├── Inline styles (element.style)
   └── <style> blocks (parsed into rule lists)

2. For each element in the tree:
   a. Find matching rules (selector matching)
   b. Sort declarations by origin + specificity:
      inline style > #id > .class/[attr] > element
      (later rules win at equal specificity)
   c. Merge into a single computed declaration map

3. Resolve inheritance
   - Inheritable properties: color, font-weight, font-style,
     text-decoration, text-align, white-space, opacity
   - Walk up the tree until a value is found, or use initial value

4. Resolve computed values
   - Percentages → cells (relative to parent content area)
   - `auto` → deferred to layout engine
   - Shorthand expansion (padding: 1 2 → top/bottom: 1, left/right: 2)
```

### Invalidation

When a mutation occurs (attribute change, class change, style property change, tree change):

1. Mark the affected element (and potentially its subtree) as style-dirty
2. On next frame, recompute styles only for dirty elements
3. If computed styles changed, mark the element as layout-dirty

---

## Layer 3: Layout Engine

### Units

Everything is measured in **terminal cells**. One cell = one monospace character column. Wide characters (CJK, some emoji) occupy 2 cells. Use a grapheme-aware width function (e.g., based on Unicode East Asian Width + grapheme cluster segmentation).

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

Since `display: block` is `flex-direction: column`, there is one layout algorithm:

1. **Determine available space** from parent content area (or terminal dimensions for root)
2. **Collect flex items** (children with `display` != `none`)
3. **Calculate base sizes**: `flex-basis`, or intrinsic content size if `auto`
4. **Distribute free space** via `flex-grow` (positive free space) and `flex-shrink` (overflow)
5. **Apply gaps** (`gap` property between items)
6. **Align main axis** (`justify-content`)
7. **Determine cross size** (max cross size of items, or container's explicit size)
8. **Align cross axis** (`align-items`, `align-self`)
9. **Handle wrapping** if `flex-wrap: wrap` — create flex lines, repeat 3–8 per line
10. **Apply min/max constraints** — clamp results to `min-width`/`max-width`, etc.

### Text Layout

Text nodes are measured for width using grapheme-aware cell counting. Word wrapping:

- `white-space: normal` — wrap at word boundaries to fit parent width
- `white-space: nowrap` — no wrapping, may overflow
- `white-space: pre` — preserve whitespace and newlines, no wrapping
- `white-space: pre-wrap` — preserve whitespace, wrap at parent width

Lines are aligned per `text-align` (left/center/right).

### Absolute Positioning

Elements with `position: absolute` are removed from flex flow. They are positioned relative to their nearest positioned ancestor (or the root) using `top`/`left` offsets. Rendered on top of normal flow, respecting `z-index`.

### Layout Output

A flat list of **layout boxes**:

```ts
interface LayoutBox {
  element: Element;
  x: number;
  y: number;
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  computedStyle: ComputedStyle;
  textLines?: string[];
  children: LayoutBox[];
  zIndex: number;
}
```

---

## Layer 4: Renderer

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

For each layout box, in z-order (lowest first):

1. **Fill background** — Set `bg` on cells within the box's area
2. **Paint borders** — Write box-drawing characters at border positions:
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
3. **Paint text** — Write text graphemes into content area cells, apply fg color, bold, italic, underline, etc.
4. **Clip** — If `overflow: hidden`, discard cells outside the box's content area

### Diffing

Compare current cell buffer against previous frame, cell-by-cell. Build a list of changed regions (consecutive changed cells on the same row). This minimizes ANSI output.

### ANSI Output

For each changed region:

1. Emit cursor-move sequence (`CSI row;col H`)
2. Emit SGR sequences for text attributes (fg, bg, bold, italic, etc.)
3. Write characters
4. Reset SGR when attributes change between cells

Wrap the entire frame update in synchronized output mode (`CSI ? 2026 h` / `CSI ? 2026 l`) if the terminal supports it, to prevent tearing.

---

## Layer 5: Terminal

### Mode Management

**On startup:**

- Enter alternate screen buffer (configurable)
- Enable raw mode (disable echo, line buffering, signal processing)
- Hide cursor
- Enable mouse reporting (optional, SGR mode 1006 for extended coordinates)
- Enable focus event reporting (optional, mode 1004)
- Enable bracketed paste (optional, mode 2004)
- Query capabilities: color profile, synchronized output (mode 2026), unicode width (mode 2027)

**On shutdown (reverse order):**

- Disable bracketed paste, focus events, mouse reporting
- Show cursor
- Exit alternate screen buffer
- Restore terminal state (cooked mode)

### Input → DOM Events

| Terminal Input    | DOM Event                            | Target                                      |
| ----------------- | ------------------------------------ | ------------------------------------------- |
| Key press         | `KeyboardEvent` (`keydown`)          | `document.activeElement` or `document.body` |
| Key release       | `KeyboardEvent` (`keyup`)            | `document.activeElement` or `document.body` |
| Mouse click       | `MouseEvent` (`click`)               | Hit-tested element from layout tree         |
| Mouse down/up     | `MouseEvent` (`mousedown`/`mouseup`) | Hit-tested element                          |
| Mouse move        | `MouseEvent` (`mousemove`)           | Hit-tested element                          |
| Mouse wheel       | `WheelEvent` (`wheel`)               | Hit-tested element                          |
| Resize (SIGWINCH) | `Event` (`resize`)                   | `window` → triggers relayout                |
| Focus/blur        | `FocusEvent`                         | `window`                                    |
| Paste             | `ClipboardEvent` (`paste`)           | `document.activeElement`                    |

**Hit-testing**: Walk layout boxes in reverse z-order. Find the topmost box whose bounds contain the mouse coordinates. Return its DOM element.

### Focus Management

- `document.activeElement` tracks the focused element
- Tab / Shift+Tab cycles among elements with `tabindex` attribute
- `focus` and `blur` events dispatched on the target element
- `focusin` / `focusout` bubble to ancestors

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

## Source Structure

```
src/
├── index.ts                    # Public API exports
├── classes/
│   └── Terminal.ts             # Main Terminal class
│
├── dom/                        # DOM polyfill (forked from @remote-dom/polyfill)
│   ├── index.ts                # DOM public exports
│   ├── classes/
│   │   ├── Attr.ts
│   │   ├── CharacterData.ts
│   │   ├── Comment.ts
│   │   ├── CSSStyleDeclaration.ts  # element.style property
│   │   ├── CustomElementRegistry.ts
│   │   ├── Document.ts
│   │   ├── DocumentFragment.ts
│   │   ├── Element.ts
│   │   ├── Event.ts
│   │   ├── EventTarget.ts
│   │   ├── MutationObserver.ts     # Real implementation (replace stub)
│   │   ├── NamedNodeMap.ts
│   │   ├── Node.ts
│   │   ├── NodeList.ts
│   │   ├── Text.ts
│   │   └── Window.ts
│   ├── constants/
│   │   └── index.ts            # Node types, symbols, internal keys
│   ├── types/
│   │   └── index.ts            # Hooks, MutationRecord, etc.
│   └── utilities/
│       ├── selectors.ts        # Selector parsing + matching
│       └── serialization.ts    # innerHTML parsing + serialization
│
├── css/                        # Style engine
│   ├── classes/
│   │   ├── StyleEngine.ts      # Orchestrates style computation
│   │   ├── CSSParser.ts        # Parses CSS text into rule list
│   │   ├── SelectorMatcher.ts  # Matches selectors to elements
│   │   └── StyleResolver.ts    # Cascade + specificity + inheritance
│   └── types/
│       └── index.ts            # ComputedStyle, CSSRule, etc.
│
├── layout/                     # Layout engine
│   ├── classes/
│   │   ├── LayoutEngine.ts     # Computes layout from styles
│   │   ├── FlexLayout.ts       # Flexbox algorithm
│   │   └── TextLayout.ts       # Text measurement + wrapping
│   └── types/
│       └── index.ts            # LayoutBox, etc.
│
├── renderer/                   # Cell buffer + ANSI output
│   ├── classes/
│   │   ├── Renderer.ts         # Orchestrates paint + diff + output
│   │   ├── CellBuffer.ts       # 2D cell grid
│   │   ├── Painter.ts          # Paints layout boxes to cells
│   │   ├── Differ.ts           # Cell-by-cell diffing
│   │   └── ANSIWriter.ts       # Generates ANSI escape sequences
│   ├── constants/
│   │   └── borders.ts          # Box-drawing character sets
│   └── types/
│       └── index.ts            # Cell, RGBColor, etc.
│
└── terminal/                   # Terminal I/O
    ├── classes/
    │   ├── TerminalManager.ts  # Mode management + capabilities
    │   ├── InputReader.ts      # Raw input parsing
    │   └── EventDispatcher.ts  # Input → DOM events + hit-testing
    └── types/
        └── index.ts
```

---

## Phasing

### Phase 1 — Styled Boxes

Get styled `<div>`s with text, borders, colors, and padding rendering to the terminal.

- Fork @remote-dom/polyfill into `src/dom/`
- Add `element.style` (CSSStyleDeclaration)
- Add `element.className` / `classList`
- CSS parser (declarations + selectors + `<style>` blocks)
- Selector matching + specificity + cascade
- Style inheritance for text properties
- Box model (padding, border, margin in cells)
- `display: block` (= flex column) layout
- Cell buffer + ANSI renderer with diffing
- Terminal management (alt screen, raw mode, cleanup)
- Keyboard input → `keydown` DOM events
- Border rendering: `single`, `rounded`, `double`, `thick`, `ascii`
- Text styling: `color`, `background-color`, `font-weight`, `font-style`, `text-decoration`
- Public API: `Terminal` class with `document`, `run()`, `exit()`

### Phase 2 — Flexbox

- `display: flex` with `flex-direction: row`
- `gap`, `justify-content`, `align-items`, `align-self`
- `flex-grow`, `flex-shrink`, `flex-basis`
- `flex-wrap: wrap`
- `width`, `height`, `min-*`, `max-*`, percentages
- `text-align`, `white-space`, `text-overflow`
- `overflow: hidden` (clipping)
- `display: none`

### Phase 3 — Interactivity

- Mouse input → `click`, `mousemove`, `mousedown`, `mouseup`, `wheel` DOM events
- Hit-testing from layout tree
- Focus management (`tabindex`, Tab/Shift+Tab, `focus`/`blur` events)
- `MutationObserver` implementation
- Resize handling (SIGWINCH → relayout + `resize` event)

### Phase 4 — Advanced Rendering

- `position: absolute` + `z-index`
- `block` and `half-block` border styles
- `overflow: scroll` (viewport scrolling)
- Terminal capability detection + graceful degradation
- Synchronized output mode (mode 2026)
- Color profile detection (truecolor / 256 / 16 / none)

### Phase 5 — Ecosystem

- Custom elements via `CustomElementRegistry`
- Built-in terminal components (spinner, progress bar, text input) as custom elements
- Framework adapters/examples (Preact, Solid, Vue)
- Custom border style definitions
- Color gradients on borders
- Theming via CSS custom properties (`--var`)
