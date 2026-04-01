# Bug Bash — Issues

## Working Summary

Bugs, UX issues, and robustness problems discovered during the component roster implementation and manual testing. These are not new features — they're fixes to existing platform behavior that affect component reliability.

---

## Issues

### BUG-1: Layout engine ignores explicit height on inline elements

**Summary**

Setting `height` via CSS on `display: inline` elements has no effect. The layout engine derives inline element height entirely from text content. This caused `<ui-input>` to collapse to zero height when the editing system cleared its text content on focus.

**Workaround:** Inline style `this.style.height = '1'` in `connectedCallback` + `display: block`.

**Expected behavior:** `height` should be respected on any element regardless of display mode, matching CSS spec where inline-block and block elements respect explicit height.

**Affected components:** `<ui-input>`, potentially `<ui-textarea>`, any future form element.

---

### BUG-2: Editing system produces zero-height content on focused empty inputs

**Summary**

When the editing system activates on an empty single-line input, `syncEditableRendering` calls `renderSingleLine` which produces `' '.repeat(width)` (all spaces). Under `white-space: normal`, these spaces collapse to nothing, resulting in zero text height. Under `white-space: pre`, there's a timing window where the style may not be computed yet.

**Expected behavior:** The editing system should guarantee at least one row of visible content when focused, regardless of white-space mode. A non-breaking space or explicit minimum height should be enforced.

**Root cause:** `Terminal.renderSingleLine()` pads with regular spaces, which are subject to whitespace collapsing.

---

### BUG-3: `overflow: scroll` containers block mouse events beyond visible bounds

**Summary**

The `EventDispatcher.containsPoint()` hit-test uses `box.height` which reflects the full content height of a scroll container, not the clipped viewport height. This causes the scroll container's invisible overflow area to swallow mouse events from elements positioned below it in the layout.

**Discovered in:** `<ui-log>` example — buttons below the log became unclickable after content exceeded the scroll viewport.

**Workaround:** Rewrote `<ui-log>` to use internal tail-window rendering instead of `overflow: scroll`.

**Expected behavior:** Hit-testing should clip to the visible viewport bounds for `overflow: scroll` and `overflow: hidden` containers.

---

### BUG-4: `overflow: scroll` offset clamping feedback loop

**Summary**

`computeScrollHeight` in `LayoutEngine` computes content height from child positions, but those positions have already been offset by `-scrollOffsetY` in the same layout pass. This creates a feedback loop where the scroll range shrinks as you scroll further, causing content to collapse at certain scroll positions.

**Discovered in:** `<ui-log>` — scrolling stopped at line 9, and at line 12 the list collapsed to show only 1 entry.

**Workaround:** `<ui-log>` avoids `overflow: scroll` entirely.

**Expected behavior:** Scroll height computation should use pre-offset child positions, or compute scroll height before applying the scroll offset.

---

### BUG-5: Modal dialog re-centers every frame causing layout shift

**Summary**

`LayoutEngine.centerInViewport()` runs every layout pass for modal dialogs. When dialog content changes size (e.g., input text content changes between focus/blur states), the dialog position shifts visibly.

**Discovered in:** `<ui-prompt>` — dialog jumped position when focusing/blurring the input field.

**Expected behavior:** Modal dialogs should compute their centered position once on `showModal()` and cache it, or only re-center when the viewport size changes — not when content size changes.

---

### BUG-6: Inline elements with background-color paint over adjacent text

**Summary**

When inline child elements (e.g., `<ui-badge>`) with `background-color` are mixed with text nodes inside the same parent, the badge's background paints over the adjacent text cells. The text content and inline children share the same row but their paint order causes overlap.

**Discovered in:** `<ui-badge>` inline-with-text example.

**Workaround:** Use flex row containers with `<span>` labels instead of mixing text nodes with inline elements.

**Expected behavior:** Inline elements should occupy their own space in the text flow without overlapping adjacent text.

---

### BUG-7: Anchor elements (`<a>`) are not focusable by default

**Summary**

In browsers, `<a href="...">` elements are focusable and participate in tab order. In our DOM, they're plain elements with no automatic `tabindex`. Users can't Tab to links.

**Expected behavior:** Elements with an `href` attribute should automatically get `tabindex="0"`, either via an `HTMLAnchorElement` class or a mutation hook that sets tabindex when `href` is added.

---

### BUG-8: `Ctrl+Click` and `Cmd+Click` unavailable in terminals

**Summary**

Terminal emulators intercept `Ctrl+Click` (right-click/context menu) and `Cmd+Click` (open link) at the terminal level. These modifier+mouse combinations never reach the application's input parser. Only `Shift+Click` is reliably passed through.

**Impact:** Multi-select patterns that rely on `Ctrl+Click` (toggle individual item) don't work. The `<ui-list>` component was redesigned to use plain click-to-toggle instead.

**This is a terminal limitation, not a bug we can fix.** Document it as a known constraint for component authors.

---

### BUG-9: Component stylesheets may not be computed before first layout

**Summary**

Custom element stylesheets are injected via `ensureCustomElementStyles()` when the element connects. But the first layout pass may run before the style engine recomputes with the new stylesheet, causing elements to render with default styles on the first frame.

**Discovered in:** `<ui-input>` `white-space: pre` not taking effect on the first render inside a dialog, causing space collapsing.

**Expected behavior:** Style injection should trigger immediate recomputation, or the layout engine should defer the first paint until styles are resolved.

---

### BUG-10: `<ui-select>` listbox does not scroll with many options

**Summary**

The select dropdown renders all options in an absolutely positioned div that grows unbounded. With many options (e.g., 20+), the list overflows off the bottom of the terminal with no scrolling or viewport clipping. Browsers cap the dropdown height and provide a scrollable viewport.

**Workaround:** None currently. Users must keep option counts small.

**Expected behavior:** The listbox should have a configurable max visible height (e.g., 8–10 rows) and only render the visible slice of options around the highlighted index, similar to the tail-window approach used in `<ui-log>`. Arrow key navigation should scroll the visible window to keep the highlighted item in view.

**Blocked by:** BUG-3 and BUG-4 (`overflow: scroll` is broken). The fix should use internal windowing instead of CSS overflow.

---

### BUG-12: Flex row children with borders don't stretch to equal height

**Summary**

When flex-direction is row and children have borders, the border rendering doesn't match the stretched height. The right border of shorter children appears detached/floating because the border box height doesn't match the flex-stretched outer height.

**Discovered in:** `<ui-sidebar>` example — sidebar with border in a flex row with taller content sibling. The sidebar's right border only covers its content height, not the row height.

**Expected behavior:** In a flex row, children should stretch to the tallest sibling's height by default (`align-items: stretch`), and borders should render at the stretched height.

---

### BUG-11: `<ui-log>` cannot use native scroll — uses internal tail window as workaround

**Summary**

The `<ui-log>` component was designed to use `overflow: scroll` for a scrollable log viewport, but had to be rewritten to use an internal tail-window approach (only rendering the last N lines as DOM children) because of BUG-3 and BUG-4.

This means the log viewer:
- Cannot be scrolled up by the user to review history (mouse wheel does nothing)
- Only shows the tail — older lines are in memory but not in the DOM
- The `height` attribute controls visible lines, not CSS height

**Expected behavior:** Once `overflow: scroll` is fixed (BUG-3 and BUG-4), the log should use native scroll so users can scroll up to review history and mouse wheel works. The internal `lines[]` array should remain for `max-lines` capping, but rendering should use the scroll container instead of windowing.
