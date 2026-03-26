# Milestone 5: Ecosystem — Issues

## Working Summary

Phase 5 builds on top of the complete rendering pipeline (Phases 1–4) to enable the broader ecosystem: custom element lifecycle, built-in terminal components, framework compatibility, and advanced styling features. This is the most outward-facing milestone — it turns the library from an internal rendering engine into a usable platform.

**Key context:**

- `CustomElementRegistry` was ported in M1T4 as part of the DOM fork. This milestone wires it to the terminal DOM's lifecycle callbacks.
- The built-in components are implemented as custom elements. Spinner, progress, and input are the initial proof-of-concept set, and the spike also defines the broader roster needed to make the framework usable by the end of the milestone.
- S57 (built-in component design spike) produces component specifications, naming guidance, and follow-up tasks. The first implementation wave informs T58–T60, and the spike may add additional built-in component tasks after T65.
- S61 (framework adapter spike) determines what adapter code, if any, is needed for Preact, Solid, and Vue. The design intent is that frameworks work out of the box via DOM mutations — adapters may be minimal or unnecessary.
- CSS custom properties (`--var` / `var()`) follow standard CSS behavior: declared on elements, inherited down the tree, resolved during style computation.
- The architecture document (`docs/learn/architecture.md`) defines the public API patterns, custom element lifecycle, and the CSS property subset (including custom properties in Phase 5).

---

## Issues

### M5T1: Custom element lifecycle

**Summary**

Wire `CustomElementRegistry` (ported in M1T4) to the terminal DOM's lifecycle. Custom elements should receive `connectedCallback` when inserted into the document tree, `disconnectedCallback` when removed, and `attributeChangedCallback` when observed attributes change. This enables component authors to build self-contained custom elements with lifecycle hooks.

**Expected Outcomes**

- Custom elements registered via `CustomElementRegistry` receive `connectedCallback` when inserted into the document
- Custom elements receive `disconnectedCallback` when removed from the document
- Custom elements receive `attributeChangedCallback` for attributes listed in their `observedAttributes`
- Lifecycle callbacks fire at the correct time relative to DOM mutations
- Integration tests verify all three lifecycle callbacks with a registered custom element

**Dependencies**

- M1T4: CustomElementRegistry (the registration mechanism)
- M1T5: Hooks bridge (detects insertions, removals, and attribute changes)

---

### M5S2: Built-in component design spike

**Summary**

Define the naming strategy, API, behavior, and visual design for the built-in component library. Spinner, progress, and input are the initial proof-of-concept components, but the spike should also define the broader roster needed to make the framework usable by the end of the milestone. Built-ins are implemented as custom elements and should use the `ui-*` prefix rather than `terminal-*` or overloaded native HTML tag names.

**Expected Outcomes**

- Component specification for each proof-of-concept built-in component (`ui-spinner`, `ui-progress`, `ui-input`) covering: element name, attributes, events dispatched, default visual appearance, and configuration options
- Recommended naming strategy for built-in components (`ui-*`) and guidance on when to use HTML-inspired semantics without overloading native tag names
- Recommended approach for animation timing (spinner frame cycling, progress bar animation)
- Recommended approach for text input cursor management and editing behavior
- Prioritized broader built-in component roster for milestone usability, including at minimum: `ui-button`, `ui-textarea`, `ui-select`, `ui-details`, `ui-table`, and `ui-codeblock`
- List of follow-up implementation tasks, including additional built-in component tasks after M5T10

**Decision Criteria**

- APIs should feel natural in a DOM context (attributes for configuration, events for state changes, CSS for styling)
- Components should be composable with the rest of the terminal DOM (work within flex layout, respect styling)
- Built-ins should feel familiar to web developers while remaining clearly framework-owned custom elements
- Animation patterns should integrate with the existing frame loop rather than introducing independent timers where possible
- Prioritization should favor components that unlock practical app-building workflows rather than visual demos alone

**Technical Constraints**

- Reference: `.ignore/references/bubbles/spinner/` (frame-based animation, ~200 LOC), `.ignore/references/bubbles/progress/` (animated bar with color blending, ~300 LOC), `.ignore/references/bubbles/textinput/` (cursor, Unicode width, paste handling)
- Use the Charm ecosystem as a capability benchmark, but not as a strict one-to-one cloning requirement

**Dependencies**

- M5T1: Custom element lifecycle (the foundation for built-in components)

---

### M5T3: Built-in spinner component

**Summary**

Implement a `<ui-spinner>` custom element with configurable animation frames and interval. The spinner cycles through a set of characters at a given interval to indicate ongoing activity.

**Expected Outcomes**

- `<ui-spinner>` is a registered custom element
- Supports configurable frame sets (e.g., dot, jump, pulse patterns)
- Supports configurable animation interval
- Animation integrates with the terminal's frame loop
- Unit tests verify frame cycling and configurability

**Technical Constraints**

- Reference: `.ignore/references/bubbles/spinner/` for frame sets and timing patterns

**Dependencies**

- M5S2: Built-in component design spike (component specification)
- M5T1: Custom element lifecycle

---

### M5T4: Built-in progress bar component

**Summary**

Implement a `<ui-progress>` custom element with configurable value, maximum, and visual style. The progress bar renders a filled/unfilled bar representing completion state, with optional smooth animation when the value changes.

**Expected Outcomes**

- `<ui-progress>` is a registered custom element
- Supports configurable `value` and `max` attributes
- Renders a visual bar proportional to `value / max`
- Supports smooth animation when `value` changes (spring-based or similar easing)
- Supports visual customization (fill character, colors) via CSS/attributes
- Unit tests verify rendering at various progress values and animation behavior

**Technical Constraints**

- Reference: `.ignore/references/bubbles/progress/` for gradient fill and color blending, `.ignore/references/harmonica/spring.go` for spring physics animation

**Dependencies**

- M5S2: Built-in component design spike (component specification)
- M5T1: Custom element lifecycle

---

### M5T5: Built-in text input component

**Summary**

Implement a `<ui-input>` custom element with cursor management, text editing, and event dispatch. The text input accepts keyboard input, manages a cursor position, handles editing operations (insert, delete, backspace, cursor movement), and dispatches `input` and `change` events.

**Expected Outcomes**

- `<ui-input>` is a registered custom element
- Manages cursor position within the input text
- Handles keyboard events for: character insertion, backspace, delete, left/right cursor movement, Home/End
- Handles paste events (inserting pasted text at cursor position)
- Renders the input text with a visible cursor indicator
- Handles wide characters (CJK, emoji) correctly for cursor positioning and display
- Dispatches `input` events on each edit and `change` events on blur
- Supports in-place horizontal scrolling when text exceeds the element's width
- Integration tests cover typing, backspace, cursor movement, paste, and wide characters

**Technical Constraints**

- Reference: `.ignore/references/bubbles/textinput/` for cursor positioning, Unicode width handling, paste buffering, and scrolling
- Reference: `.ignore/references/huh/field_input.go` for validation and placeholder patterns

**Dependencies**

- M5S2: Built-in component design spike (component specification)
- M5T1: Custom element lifecycle
- M3T4: Focus management (text input needs to receive keyboard events when focused)
- M1T17: Grapheme width utility (for cursor positioning with wide characters)

---

### M5S6: Framework adapter spike

**Summary**

Investigate what adapter code, if any, is needed for Preact, Solid, and Vue to work with the terminal DOM. The design intent is that the DOM polyfill should be compatible with any framework that produces DOM mutations. Determine whether each framework needs explicit adapter code, configuration, or works out of the box.

**Expected Outcomes**

- Decision document covering each framework (Preact, Solid, Vue) with: whether adapter code is needed, what the adapter does (if applicable), and any framework-specific constraints or limitations
- Recommended integration approach per framework
- List of follow-up tasks for M5T7 (framework examples) — what each example needs to demonstrate

**Decision Criteria**

- Prefer zero-adapter solutions where possible — the DOM layer should be sufficient
- Where adapters are needed, they should be minimal and focused on bridging framework-specific assumptions about the DOM environment
- Consider both development experience (hot reload, dev tools) and production usage

**Dependencies**

- M5T1: Custom element lifecycle (frameworks may use custom elements)
- M1T29: Terminal class (the public API that examples will use)

---

### M5T7: Framework examples

**Summary**

Create working example applications in `examples/` demonstrating usage with vanilla JS, Preact, Solid, and Vue. Each example should be a minimal but complete terminal application that showcases the library's capabilities with that framework.

**Expected Outcomes**

- `examples/` contains working example applications for: vanilla JS, Preact, Solid, and Vue
- Each example creates a terminal app, renders styled elements, and handles keyboard input
- Each example runs and renders correctly to the terminal
- Examples serve as both validation of framework compatibility and documentation for users

**Dependencies**

- M5S6: Framework adapter spike (determines what adapters/configuration each framework needs)
- M1T29: Terminal class (public API)

---

### M5T8: Custom border style definitions

**Summary**

Allow users to define custom border character sets and register them as named border styles. This extends the built-in border styles (single, rounded, double, thick, ascii, hidden, block, half-block) with user-defined alternatives.

**Expected Outcomes**

- Users can define a border character set (corners, horizontal edges, vertical edges)
- Users can register custom character sets as named border styles
- Registered custom styles work with `border-style` just like built-in styles
- Unit tests verify custom style registration and rendering

**Technical Constraints**

- Reference: `.ignore/references/lipgloss/borders.go` for the border style registration pattern and character set structure

**Dependencies**

- M1T22: Painter (border rendering infrastructure)

---

### M5T9: Color gradients on borders

**Summary**

Implement gradient color interpolation along border edges, creating a smooth color transition along each edge. The user-facing API for declaring gradients (e.g., a CSS function, multiple color values, or a new property) is not defined in the architecture document — the coding agent should study the reference implementation and design an API that feels natural within the existing CSS property model.

**Expected Outcomes**

- A user-facing API exists for declaring border color gradients
- Border edges support color gradient interpolation (color transitions smoothly along the edge)
- Gradient is applied per-cell along each border edge
- The API integrates naturally with the existing `border-color` property or extends it in a consistent way
- Unit tests assert per-cell border color in the cell buffer for gradient borders

**Technical Constraints**

- Reference: `.ignore/references/lipgloss/blending.go` for color interpolation algorithms

**Dependencies**

- M1T22: Painter (border rendering)
- M1T24: ANSI writer (per-cell color output)

---

### M5T10: CSS custom properties

**Summary**

Implement CSS custom properties (`--var` declaration and `var()` resolution) in the style engine. Custom properties are declared on elements (inline or in `<style>` blocks), inherited down the tree, and resolved during style computation with support for fallback values.

**Expected Outcomes**

- Custom properties can be declared with `--name: value` syntax in both inline styles and `<style>` blocks
- `var(--name)` resolves to the custom property's value during style computation
- `var(--name, fallback)` resolves to the fallback value when the property is not defined
- Custom properties inherit down the tree (following the same inheritance path as other inheritable properties)
- Unit tests cover: declaration and usage, fallback values, inheritance chains, and interaction with the cascade

**Dependencies**

- M1T12: CSS parser (needs to parse `--var` declarations and `var()` functions)
- M1T14: Style resolver (handles inheritance and resolution)
- M1T15: Style engine orchestrator (coordinates computation)

---

### M5T11: Built-in button component

**Summary**

Implement a `<ui-button>` custom element for mouse and keyboard activation. The button should behave as the basic action primitive for forms, dialogs, and menus.

**Expected Outcomes**

- `<ui-button>` is a registered custom element
- Supports disabled and variant-style states
- Dispatches `click` on activation via keyboard and mouse
- Integrates with focus management and styling
- Unit and integration tests cover activation behavior and disabled handling

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M3T4: Focus management

---

### M5T12: Built-in textarea component

**Summary**

Implement a `<ui-textarea>` custom element for multi-line text editing. It should support cursor movement, insertion and deletion across lines, paste handling, and viewport scrolling within the element.

**Expected Outcomes**

- `<ui-textarea>` is a registered custom element
- Supports multi-line editing, paste, and scrolling
- Handles wide characters correctly for cursor positioning and display
- Dispatches `input` and `change` events
- Integration tests cover editing, navigation, and scrolling behavior

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M3T4: Focus management
- M1T17: Grapheme width utility
- M4T3: Overflow scroll

---

### M5T13: Built-in select component

**Summary**

Implement a `<ui-select>` custom element for choosing one value from a list of options. The component should support keyboard navigation, expanded/collapsed presentation, and selected-value updates.

**Expected Outcomes**

- `<ui-select>` is a registered custom element
- Supports option lists and selected value state
- Supports keyboard navigation and activation
- Dispatches `input` and `change` events when the selection changes
- Integration tests cover navigation, expansion, and selection behavior

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M3T4: Focus management

---

### M5T14: Built-in details component

**Summary**

Implement a `<ui-details>` custom element for expandable and collapsible disclosure sections. The component should support an HTML-inspired summary/content structure and toggle state changes.

**Expected Outcomes**

- `<ui-details>` is a registered custom element
- Supports expanded and collapsed states
- Supports keyboard and mouse toggling
- Dispatches a `toggle` event when its state changes
- Unit and integration tests cover structure, state transitions, and event dispatch

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M3T4: Focus management

---

### M5T15: Built-in table component

**Summary**

Implement a `<ui-table>` custom element for structured tabular data display. The first version should prioritize correct rendering, sizing, and styling, with richer behaviors phased in later.

**Expected Outcomes**

- `<ui-table>` is a registered custom element
- Supports rendering header and body rows from child content or structured data attributes
- Aligns columns consistently across rows
- Composes with existing layout and styling systems
- Unit and integration tests cover rendering and alignment behavior

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M2T6: Explicit sizing and constraints

---

### M5T16: Built-in code block component

**Summary**

Implement a `<ui-codeblock>` custom element for displaying preformatted code and terminal-friendly source snippets. The first version should support plain rendering, line wrapping or clipping strategy, and optional line numbers, with syntax highlighting designed as a later enhancement.

**Expected Outcomes**

- `<ui-codeblock>` is a registered custom element
- Supports preformatted code rendering with preserved whitespace
- Supports optional line numbers
- Handles long-line overflow predictably
- Unit and integration tests cover formatting and overflow behavior

**Dependencies**

- M5S2: Built-in component design spike
- M5T1: Custom element lifecycle
- M2T7: Text alignment and wrapping modes
- M4T3: Overflow scroll

---

### M5T17: Text selection for ui-input and ui-textarea

**Summary**

Add text selection support to `<ui-input>` (and later `<ui-textarea>`). Users should be able to select text with Shift+Arrow, Shift+Home/End, Shift+Alt+Arrow (word selection), and Ctrl+A (select all). Selected text should render with a visible highlight, and standard clipboard operations (copy, cut) should work on the selection.

**Expected Outcomes**

- Shift+ArrowLeft/Right extends or contracts the selection by one grapheme
- Shift+Home/End extends the selection to the start or end of the line
- Shift+Alt+Arrow (or Shift+Alt+B/F) extends the selection by word
- Ctrl+A or Cmd+A selects all text in the input
- Selected text renders with a visible indicator (inverted colors or distinct background)
- Cut removes the selected text and dispatches an `input` event
- Copy places the selected text on the clipboard (if clipboard access is available)
- Typing while text is selected replaces the selection
- Backspace/Delete with an active selection removes the selected text
- Clicking repositions the cursor and clears the selection
- Unit and integration tests cover selection creation, expansion, rendering, and clipboard operations

**Technical Constraints**

- Selection rendering requires per-character styling within the input's rendered text; this may require renderer-level support for inline style overrides or a dedicated selection rendering path in the Painter
- Clipboard write access may not be available in all terminal environments; degrade gracefully

**Dependencies**

- M5T5: Built-in text input component (the base component to extend)
- M5T12: Built-in textarea component (extend selection to multi-line when available)

---
