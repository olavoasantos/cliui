# Milestone 3: Interactivity — Issues

## Working Summary

Phase 3 adds user interaction capabilities to the terminal DOM. Phase 1 established keyboard input dispatch (to `document.body`) and terminal mode management (including mouse reporting mode). This milestone completes the interaction layer: mouse input parsing and dispatch via hit-testing, focus management with keyboard event retargeting, `MutationObserver` for external DOM observation, window focus/blur events, and terminal resize handling.

**Key context:**

- Hit-testing in this phase uses reverse document order (later-in-tree elements are on top). Z-index-based paint ordering is added in Phase 4.
- Focus management updates the keyboard event dispatcher (M1T28) to target `document.activeElement` instead of `document.body`.
- `MutationObserver` builds on the hooks bridge (M1T5) which already intercepts all DOM mutations. The polyfill has a stub that this replaces with a real implementation.
- Mouse reporting mode (SGR 1006) is already enabled by `TerminalManager` (M1T26) — this milestone adds the parsing and dispatch of those events.
- `MouseEvent` was created in M1T6 as part of the DOM event classes. `WheelEvent` is created in M3T3 alongside its dispatch logic.
- The architecture document (`docs/learn/architecture.md`) defines the input→DOM event mapping table and focus management behavior.

---

## Issues

### M3T1: Mouse input parsing

**Summary**

Extend `InputReader` (M1T27) to parse SGR mouse reporting sequences (mode 1006) into structured mouse events. This covers button identification, terminal coordinates, modifier keys, and event type (press, release, motion, wheel).

**Expected Outcomes**

- `InputReader` parses SGR mouse escape sequences into structured mouse event data
- Supports: button identification (left, middle, right, wheel up/down, and additional buttons), terminal coordinates (column, row), modifier detection (shift, alt, ctrl), and event type (press, release, motion, wheel)
- Unit tests feed known mouse escape sequences and assert correctly parsed events

**Technical Constraints**

- Reference: `.ignore/references/bubbletea/mouse.go` for mouse button enumeration and position tracking patterns

**Dependencies**

- M1T27: Keyboard input reader (the class being extended)

---

### M3T2: Hit-testing

**Summary**

Implement hit-testing in `EventDispatcher` — given terminal coordinates (from a mouse event), determine which DOM element is at that position by walking the layout box tree. In this phase, hit-testing uses reverse document order (later-in-tree elements are considered "on top"). Z-index-based ordering is added in Phase 4.

**Expected Outcomes**

- Given terminal coordinates, returns the DOM element at that position (or `null`/`document.body` if no element is hit)
- Walks layout boxes in reverse document order to find the topmost element whose bounds contain the coordinates
- Accounts for element visibility (`display: none` elements are not hit-testable)
- Unit tests use known layout box positions and assert correct element identification

**Integration Points**

- Phase 4 updates hit-testing to use z-index ordering instead of document order

**Dependencies**

- M1T28: EventDispatcher (the class being extended)
- M1T20: LayoutEngine (provides the layout box tree to walk)

---

### M3T3: Mouse event dispatch

**Summary**

Convert parsed mouse events into DOM `MouseEvent` and `WheelEvent` objects, use hit-testing to find the target element, and dispatch with bubbling. This completes the mouse input→DOM event pipeline.

**Expected Outcomes**

- `WheelEvent` class is implemented in `src/dom/classes/` (not present in the polyfill or M1T6)
- Parsed mouse events are converted to DOM `MouseEvent` objects for: `click`, `mousedown`, `mouseup`, `mousemove`
- Parsed wheel events are converted to DOM `WheelEvent` objects for: `wheel`
- Each event is dispatched to the hit-tested target element with bubbling enabled
- Event properties include: target element, terminal coordinates, button identifier, modifier keys
- Integration tests verify the full pipeline from mouse escape sequence → hit-test → DOM event dispatch

**Dependencies**

- M1T6: DOM event classes (`MouseEvent`)
- M3T1: Mouse input parsing (produces structured mouse events)
- M3T2: Hit-testing (identifies the target element)

---

### M3T4: Focus management

**Summary**

Implement focus tracking and Tab navigation. `document.activeElement` tracks the currently focused element. Tab/Shift+Tab cycles focus among elements with a `tabindex` attribute. Focus changes dispatch `focus`/`blur` (non-bubbling) and `focusin`/`focusout` (bubbling) events. Update the keyboard event dispatcher (M1T28) to dispatch keyboard and paste events to `document.activeElement` instead of `document.body`.

**Expected Outcomes**

- `document.activeElement` returns the currently focused element (defaults to `document.body`)
- Tab cycles focus forward among elements with `tabindex`, in document order; Shift+Tab cycles backward
- `focus` and `blur` events are dispatched on the target element (non-bubbling)
- `focusin` and `focusout` events bubble to ancestors
- Keyboard and paste events are dispatched to `document.activeElement` instead of `document.body`
- Unit tests cover: focus cycling order, event dispatch (all four event types), keyboard event retargeting to the active element

**Dependencies**

- M1T3: Document class (`activeElement` property)
- M1T6: DOM event classes (`FocusEvent`)
- M1T28: Keyboard event dispatcher (updated to target `document.activeElement`)

---

### M3T5: MutationObserver

**Summary**

Implement a real `MutationObserver` that replaces the polyfill's stub. Built on the hooks bridge (M1T5), it collects mutations during a microtask and delivers batched `MutationRecord` arrays to registered observer callbacks. This enables external code (including framework adapters) to observe DOM changes.

**Expected Outcomes**

- `MutationObserver` class exists in `src/dom/classes/`
- Supports `observe(target, options)` with options for `childList`, `attributes`, `characterData`, and `subtree`
- Supports `disconnect()` to stop observing and `takeRecords()` to retrieve pending records
- Mutations are collected during a microtask and delivered as batched `MutationRecord` arrays
- Each `MutationRecord` includes: type, target, addedNodes, removedNodes, attributeName, oldValue (when requested)
- Unit tests cover: `childList` observation (add/remove nodes), `attributes` observation (set/remove attributes), `characterData` observation (text changes), `subtree` observation, batched delivery timing, and `disconnect`/`takeRecords`

**Technical Constraints**

- Reference: `.ignore/references/happy-dom/src/mutation-observer/` for the full API shape and `MutationRecord` structure

**Dependencies**

- M1T5: Hooks bridge (provides the mutation observation foundation)

---

### M3T6: Window focus and blur events

**Summary**

Parse terminal focus/blur reporting sequences (mode 1004, already enabled by `TerminalManager` in M1T26) in `InputReader`, and dispatch `FocusEvent` on `window` when the terminal gains or loses focus.

**Expected Outcomes**

- `InputReader` parses focus-in and focus-out escape sequences (mode 1004)
- `FocusEvent` is dispatched on `window` when focus is gained or lost
- Unit tests feed known focus/blur escape sequences and assert correct event dispatch on `window`

**Dependencies**

- M1T27: InputReader (the class being extended)
- M1T3: Window class (event dispatch target)
- M1T6: DOM event classes (`FocusEvent`)

---

### M3T7: Resize handling

**Summary**

Handle terminal resize events. Listen for SIGWINCH, update terminal dimensions, resize the cell buffer, trigger a full relayout, and dispatch a `resize` event on `window`. This ensures the UI adapts when the user resizes their terminal.

**Expected Outcomes**

- SIGWINCH signal triggers dimension updates, cell buffer resize, and a full relayout
- A `resize` event is dispatched on `window` after the relayout
- The next frame renders correctly at the new dimensions
- Integration tests simulate a resize signal and verify correct behavior

**Dependencies**

- M1T21: Cell buffer (needs resize capability)
- M1T20: LayoutEngine (triggers relayout)
- M1T26: TerminalManager (manages terminal dimensions)
- M1T29: Terminal class (coordinates the resize→relayout→render cycle)

---
