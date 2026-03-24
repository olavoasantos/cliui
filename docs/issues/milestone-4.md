# Milestone 4: Advanced Rendering — Issues

## Working Summary

Phase 4 adds advanced rendering capabilities: absolute positioning with z-index layering, remaining border styles, scrollable content areas, and terminal capability detection with graceful degradation. These features complete the rendering pipeline established in Phases 1–3.

**Key context:**

- Absolute positioning removes elements from flex flow and positions them relative to their nearest positioned ancestor (or root). This is the only non-flex layout mode.
- Z-index affects both paint ordering (lowest z-index painted first) and hit-testing (Phase 3's reverse-document-order hit-testing is updated to use z-order).
- `overflow: scroll` is content clipping only — no visible scrollbar is rendered. Scroll offset is updated via `wheel` events.
- Terminal capability detection queries for color support (truecolor/256/16/none), synchronized output (mode 2026), and unicode width (mode 2027). The system degrades gracefully when capabilities are missing.
- Phase 1 targeted truecolor output only. This milestone adds color downscaling to 256-color and 16-color palettes.
- The architecture document (`docs/learn/architecture.md`) defines the absolute positioning behavior, z-index ordering, border character sets, and capability detection modes.

---

## Issues

### M4T1: Absolute positioning

**Summary**

Implement `position: absolute` in the layout engine. Absolutely positioned elements are removed from the flex flow and positioned relative to their nearest positioned ancestor or the root. Position is determined by `top` and `left` offsets in cells. Only `top` and `left` are supported — `right` and `bottom` are not part of the CSS subset.

**Expected Outcomes**

- Elements with `position: absolute` are excluded from flex layout flow
- They are positioned relative to their nearest positioned ancestor, or the root if none exists
- `top` and `left` offsets (in cells) control the element's position
- Absolutely positioned elements shrink-wrap to their content size unless explicit `width`/`height` is set
- Absolutely positioned elements still participate in the box model (padding, border, margin)
- Unit tests verify correct positioning relative to various ancestor configurations

**Dependencies**

- M1T19: FlexLayout (the layout algorithm being extended)
- M1T20: LayoutEngine (orchestrates layout including absolute elements)

---

### M4T2: Z-index and paint ordering

**Summary**

Implement `z-index` sorting in the paint phase so that overlapping elements render in the correct layer order (lowest z-index painted first, highest on top). Also update hit-testing (M3T2) to use z-order instead of reverse document order, so mouse events target the visually topmost element.

**Expected Outcomes**

- Layout boxes are painted in z-index order (lowest first) rather than document order
- Elements with higher `z-index` visually overlap elements with lower `z-index`
- Hit-testing returns the element with the highest z-index at the given coordinates (instead of reverse document order)
- Z-index sorting is flat (global) — no nested stacking contexts. All elements are sorted in a single ordering, with document order as the tiebreaker for equal z-index values
- Unit tests assert correct overlap in the cell buffer and correct hit-test results with overlapping elements

**Technical Constraints**

- Reference: `.ignore/references/lipgloss/layer.go` for z-order compositing patterns

**Dependencies**

- M4T1: Absolute positioning (z-index is most meaningful with absolutely positioned elements)
- M1T22: Painter (paint ordering being changed)
- M3T2: Hit-testing (being updated from document order to z-order)

---

### M4T3: Block and half-block border styles

**Summary**

Implement the remaining two border styles: `block` and `half-block`. These use Unicode block characters to create solid and half-block borders, completing the full set of border styles defined in the architecture document.

**Expected Outcomes**

- `border-style: block` renders using full block characters (`█`)
- `border-style: half-block` renders using half-block characters (`▀▄▌▐`) and corner combinations (`▛▜▙▟`)
- Character mappings are added to the border constants established in M1T22
- Unit tests assert correct characters in the cell buffer for both styles

**Technical Constraints**

- Reference: `.ignore/references/lipgloss/borders.go` for the block and half-block character sets

**Dependencies**

- M1T22: Painter (border rendering infrastructure)

*Can run in parallel with M4T1 and M4T2.*

---

### M4T4: Overflow scroll

**Summary**

Implement `overflow: scroll` — track a scroll offset per element, clip content to the content area (like `overflow: hidden`), and shift visible content based on the scroll position. Scroll offset is updated in response to `wheel` events on the element. No visible scrollbar is rendered.

**Expected Outcomes**

- Elements with `overflow: scroll` clip content to their content area
- A vertical scroll offset is tracked per scrollable element
- Content is shifted vertically by the scroll offset, making different portions visible
- `wheel` events on the element update the scroll offset
- Scroll offset is clamped to prevent scrolling beyond content boundaries
- Integration tests verify scrolling behavior: content shifts on wheel events, clipping is applied, and boundary clamping works

**Technical Constraints**

- Reference: `.ignore/references/bubbles/viewport/` for scrollable content area patterns

**Dependencies**

- M2T8: Content overflow clipping (`overflow: hidden` infrastructure to build on)
- M3T3: Mouse event dispatch (`wheel` events must be available)

---

### M4T5: Terminal capability detection

**Summary**

Query the terminal for supported capabilities: color profile (truecolor, 256-color, 16-color, or none), synchronized output support (mode 2026), and unicode width support (mode 2027). Store detected capabilities for use by the renderer and ANSI writer. Provide graceful degradation when capabilities are missing.

**Expected Outcomes**

- Color profile is detected: truecolor (24-bit), 256-color, 16-color, or no color
- Synchronized output support (mode 2026) is detected
- Unicode width support (mode 2027) is detected
- Detected capabilities are stored and accessible to the renderer pipeline
- Graceful degradation: the system works with any detected capability level (no crashes or broken output on limited terminals)
- Unit tests mock terminal responses and verify correct capability detection for each profile

**Dependencies**

- M1T26: TerminalManager (manages terminal communication)

*Can run in parallel with M4T1–M4T4.*

---

### M4T6: Synchronized output

**Summary**

Wrap frame updates in synchronized output sequences when the terminal supports it. Synchronized output (mode 2026) tells the terminal to buffer all output between the begin and end sequences, then flush atomically — preventing visual tearing during frame updates.

**Expected Outcomes**

- When mode 2026 is supported (detected via M4T5), frame output is wrapped in `CSI ? 2026 h` (begin) and `CSI ? 2026 l` (end) sequences
- When mode 2026 is not supported, frame output is emitted without wrapping (no-op degradation)
- Unit tests assert that synchronized output sequences wrap ANSI output when capability is present, and are absent when not

**Dependencies**

- M4T5: Terminal capability detection (determines whether mode 2026 is supported)
- M1T24: ANSI writer (the output being wrapped)

---

### M4T7: Color profile adaptation

**Summary**

Implement color downscaling — map 24-bit RGB colors to 256-color or 16-color ANSI palettes based on the detected terminal color profile. This allows the library to produce correct output on terminals that don't support truecolor.

**Expected Outcomes**

- 24-bit RGB colors are downscaled to the nearest 256-color palette entry when the terminal supports 256 colors but not truecolor
- 24-bit RGB colors are downscaled to the nearest 16-color ANSI entry when the terminal supports only 16 colors
- Color output is omitted entirely when no color support is detected
- The ANSI writer emits the appropriate SGR sequences for the detected color profile (truecolor, 256, or 16)
- Unit tests assert correct color mapping for each profile level

**Technical Constraints**

- Reference: `.ignore/references/lipgloss/color.go` for ANSI 16/256/truecolor SGR encoding, `.ignore/references/lipgloss/blending.go` for color downsampling algorithms

**Dependencies**

- M4T5: Terminal capability detection (provides the color profile)
- M1T24: ANSI writer (emits color SGR sequences)

---
