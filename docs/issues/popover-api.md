# Milestone: Popover API — Issues

## Working Summary

Implement the HTML Popover API as a platform-level feature in the DOM layer. This provides a standard mechanism for displaying overlay content (menus, dropdowns, toasts, tooltips) with built-in light-dismiss, top-layer stacking, focus management, and declarative trigger relationships.

The Popover API replaces the ad-hoc overlay patterns currently hand-rolled across multiple components (`<ui-menu>`, `<ui-select>`, `<ui-toast>`). Once implemented, these components can be refactored to use `popover` attributes instead of custom show/hide/z-index/document-click logic.

**Key context:**

- We already have `HTMLDialogElement` with modal semantics (focus trapping, Escape-to-close, backdrop). The Popover API covers the **non-modal** overlay case — menus, dropdowns, tooltips, toasts.
- `ToggleEvent` already exists (`src/dom/classes/ToggleEvent.ts`) with `oldState`/`newState`.
- Pseudo-class matching (`:focus`, `:hover`, `:active`) already works in the CSS engine (`src/dom/utilities/matches.ts`). Adding `:popover-open` follows the same pattern.
- `EventDispatcher` already handles hit-testing and focus management. Light-dismiss hooks into the existing mouse event pipeline.
- The `<dialog>` element's modal rendering (z-index, backdrop) provides a reference for top-layer implementation.

**Reference:**
- [MDN: Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [MDN: Using the Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)

---

## Issues

### POP-1: `popover` attribute and element state management

**Summary**

Add `popover` as a recognized global attribute on `HTMLElement`. The attribute accepts three values: `"auto"` (default when attribute is present with no value), `"hint"`, and `"manual"`. Hidden by default (`display: none`), shown when in the open state.

Implement the `HTMLElement.popover` property for getting/setting the popover state programmatically, and the three control methods:

- `showPopover()` — shows the popover, adds to top layer, dispatches `beforetoggle` (cancelable) then `toggle`.
- `hidePopover()` — hides the popover, removes from top layer, dispatches `beforetoggle` then `toggle`.
- `togglePopover()` — toggles between shown and hidden.

Throw `InvalidStateError` if `showPopover()` is called on an already-shown popover, or `hidePopover()` on an already-hidden one.

**Expected Outcomes**

- Any element with `popover` attribute is hidden by default via the UA stylesheet
- `showPopover()` makes it visible and dispatches `beforetoggle`/`toggle` with correct `oldState`/`newState`
- `hidePopover()` hides it and dispatches events
- `togglePopover()` toggles the state
- `element.popover` property reflects the attribute (`"auto"`, `"hint"`, `"manual"`, or `null`)
- Setting `popover` with no value defaults to `"auto"`
- Calling show on an already-shown popover throws
- `beforetoggle` is cancelable — if `preventDefault()` is called, the state change is aborted

**Dependencies**

- None (builds on existing `HTMLElement`, `ToggleEvent`)

---

### POP-2: Top layer and rendering order

**Summary**

Implement a top-layer concept in the rendering pipeline. Popovers in the showing state are rendered above all other content, regardless of DOM position or z-index. The top layer is an ordered stack — newer popovers render above older ones.

The `<dialog>` element's modal rendering already approximates this with z-index manipulation. This issue formalizes it as a proper top-layer managed by the `Document`, used by both `<dialog>` and popover elements.

**Expected Outcomes**

- `Document` maintains an ordered top-layer stack of elements
- `showPopover()` adds the element to the top layer
- `hidePopover()` removes it
- `showModal()` on `<dialog>` also uses the top-layer stack
- The layout engine and painter render top-layer elements after all normal-flow content
- Top-layer elements are painted on top regardless of their DOM position
- Hit-testing correctly targets top-layer elements first

**Dependencies**

- POP-1 (popover state management)

---

### POP-3: Light dismiss for `auto` popovers

**Summary**

Implement "light dismiss" behavior for `popover="auto"` elements: clicking outside the popover closes it. Pressing Escape closes it. Showing a second `auto` popover closes the first (only one `auto` popover at a time, except for nested popovers).

This replaces the manual document-click listeners currently used in `<ui-menu>` and `<ui-select>`.

**Expected Outcomes**

- Clicking outside an open `auto` popover hides it
- Pressing Escape hides the topmost `auto` popover
- Showing a second `auto` popover hides the first
- `manual` popovers are NOT light-dismissed — they stay open until explicitly hidden
- `hint` popovers ARE light-dismissed, but do NOT close `auto` popovers when shown
- Showing a second `hint` popover closes the first `hint` popover
- Nested `auto` popovers (DOM descendants, or linked via `popovertarget`) are allowed to coexist

**Dependencies**

- POP-1 (popover state management)
- POP-2 (top layer — needed to know which popover is "topmost")

---

### POP-4: `popovertarget` and `popovertargetaction` attributes

**Summary**

Implement declarative popover control via button attributes. A `<button>` (or `<ui-button>`) with `popovertarget="popover-id"` toggles the referenced popover element on activation (click or Enter/Space). The `popovertargetaction` attribute specifies `"show"`, `"hide"`, or `"toggle"` (default: `"toggle"`).

This enables fully declarative popover triggers without JavaScript:
```html
<ui-button popovertarget="my-menu">Open Menu</ui-button>
<ui-menu id="my-menu" popover="auto">...</ui-menu>
```

**Expected Outcomes**

- Clicking a button with `popovertarget` toggles the referenced popover
- Enter/Space on a focused `popovertarget` button triggers the action
- `popovertargetaction="show"` only shows (no-op if already shown)
- `popovertargetaction="hide"` only hides (no-op if already hidden)
- `popovertargetaction="toggle"` toggles (default)
- The button resolves the target by `id` from the document
- Works with both `<button>`, `<ui-button>`, and `<input type="button">`

**Dependencies**

- POP-1 (popover state management)

---

### POP-5: Focus management for popovers

**Summary**

When a popover is shown via a `popovertarget` button, the keyboard focus navigation order is updated so the popover's focusable children are next in the tab sequence. When the popover is closed (via Escape, light dismiss, or explicit hide), focus returns to the invoker button.

This replaces the manual focus-return logic currently in `<ui-menu>`.

**Expected Outcomes**

- When a popover opens, Tab moves focus into the popover's focusable children
- When a popover closes, focus returns to the invoking button (the `popovertarget` element)
- If the popover was opened via `showPopover()` without a button, focus is not automatically moved
- Focus does NOT get trapped in non-modal popovers (unlike `<dialog showModal()>`)
- Tab can move out of the popover naturally, but the popover remains open (auto popovers close via light dismiss, not focus loss)

**Dependencies**

- POP-1 (popover state management)
- POP-4 (`popovertarget` — needed to know the invoker)

---

### POP-6: `:popover-open` CSS pseudo-class

**Summary**

Add `:popover-open` to the pseudo-class matching in the CSS engine. This pseudo-class matches elements that have the `popover` attribute and are currently in the showing state.

**Expected Outcomes**

- `:popover-open` matches only popover elements that are currently shown
- It does NOT match `<dialog>` elements (those use `[open]`)
- Works in compound selectors: `ui-menu:popover-open { ... }`
- Style recomputation triggers correctly when popover state changes

**Dependencies**

- POP-1 (popover state management)

---

### POP-7: UA stylesheet rules for popovers

**Summary**

Add default styles for popover elements to the user-agent stylesheet:

- `[popover]` — `display: none` (hidden by default)
- `[popover]:popover-open` — `display: block; position: absolute` (or the appropriate display value)
- `::backdrop` for popovers (optional, lower priority than dialog backdrop)

**Expected Outcomes**

- Elements with `popover` attribute are hidden by default
- Shown popovers render as positioned overlays
- User stylesheets can override the defaults normally
- The UA rules have the lowest specificity

**Dependencies**

- POP-1 (popover state management)
- POP-6 (`:popover-open` pseudo-class)

---

### POP-8: Refactor components to use Popover API

**Summary**

Migrate existing components from hand-rolled overlay logic to the Popover API:

- **`<ui-menu>`** — becomes `popover="auto"`. Remove manual document-click listener, display toggling, and focus-return logic. The `<ui-dropdown>` trigger uses `popovertarget`.
- **`<ui-select>` listbox** — the dropdown overlay becomes a popover. Remove manual open/close state, document-click listener, and z-index management.
- **`<ui-toast>`** — uses `popover="manual"` (no light dismiss, multiple allowed, auto-removes via timer).
- **`<ui-confirmation>` / `<ui-prompt>`** — keep using `<dialog>` for modal semantics. No change needed.

**Expected Outcomes**

- `<ui-menu>` uses `popover="auto"` — light dismiss works, one-at-a-time enforcement, focus returns to dropdown
- `<ui-select>` listbox uses `popover="auto"` — light dismiss closes dropdown
- `<ui-toast>` uses `popover="manual"` — multiple toasts allowed, no light dismiss
- All existing component tests still pass
- Manual document-click listeners, z-index hacks, and display toggling removed from components
- Components are simpler with less code

**Dependencies**

- POP-1 through POP-7 (full Popover API implementation)

---

## Execution Notes

### Ordering

POP-1 is foundational — everything depends on it. POP-2 (top layer) and POP-4 (popovertarget) can be developed in parallel after POP-1. POP-3 (light dismiss) depends on both POP-1 and POP-2. POP-5 (focus) depends on POP-4. POP-6 and POP-7 (CSS) are independent of POP-3/4/5 and can be done anytime after POP-1. POP-8 (refactor) comes last.

```
POP-1 ──┬── POP-2 ── POP-3
        ├── POP-4 ── POP-5
        ├── POP-6
        └── POP-7
                       POP-8 (after all above)
```

### Risks

- **Top layer rendering** — the current layout/paint pipeline uses z-index for stacking. A proper top layer needs elements to render *after* the normal tree, not just at a higher z-index. This may require changes to the painter's traversal order.
- **Light dismiss vs terminal mouse events** — Ctrl+Click and Cmd+Click aren't available in terminals. Light dismiss only uses plain click, which is fine.
- **`overflow: scroll` interaction** — the layout engine has known issues with `overflow: scroll` hit-testing (scroll containers block mouse events beyond their visible bounds). Top-layer elements should bypass scroll container clipping entirely.
- **Dialog refactor** — `HTMLDialogElement.showModal()` currently manages its own stacking. It should be migrated to use the shared top-layer stack to avoid two competing overlay systems.
