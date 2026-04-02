# Milestone 13: Web API ↔ Terminal Bridge — Issues

## Working Summary

Phase 13 wires standard Web APIs to their terminal escape sequence equivalents. The DOM polyfill already mirrors the browser's API shape — `Window`, `Document`, `Navigator`, `Location`. This milestone makes those APIs actually _do something_ by connecting them to the terminal capabilities underneath.

**Four groups of work:**

1. **Document integration (M13T1–M13T2):** `<title>` → window title, `<a href>` → clickable hyperlinks, `document.hasFocus()`, `document.visibilityState`.
2. **Window dialogs (M13T3):** `alert()`, `confirm()`, `prompt()` built on `<dialog>` + `<button>` + `<input>`.
3. **Browser APIs (M13T4–M13T6):** `Notification` API → OS notifications, `navigator.clipboard` read/write, `window.matchMedia('(prefers-color-scheme: dark)')` via terminal color query.
4. **Terminal-specific bridges (M13T7–M13T8):** `window.location.pathname` → OSC 7 CWD reporting, cursor style from CSS `cursor` property.

**Key context and design decisions:**

- **Most mappings use existing escape sequences.** OSC 2 (window title), OSC 8 (hyperlinks — already implemented in `ANSIWriter`), OSC 9/777 (notifications), OSC 52 (clipboard — already used by the caret system), OSC 10/11 (color query) are all well-established terminal protocols.
- **`alert()`/`confirm()`/`prompt()` are blocking.** In browsers, these APIs block the main thread until the user responds. In terminal-dom, they render a `<dialog>` and return a `Promise` that resolves when the user clicks a button or presses Enter/Escape. Using `await alert('message')` matches the blocking mental model while being async-safe.
- **Hyperlink rendering already works.** The `ANSIWriter` has `serializeHyperlink()` using OSC 8, and cells have a `hyperlink` field. The missing piece is wiring `<a href="...">` to set the `hyperlink` field on its text cells during paint.
- **Color scheme detection queries the terminal.** OSC 10 (foreground) and OSC 11 (background) return the terminal's current colors. By analyzing the background luminance, we determine light vs dark theme. This maps to `window.matchMedia('(prefers-color-scheme: dark)')` — the exact API web developers already use.
- **OSC 7 reports CWD to the terminal.** This enables "Open New Tab Here" in iTerm2, Kitty, WezTerm, etc. Mapped to `window.location.pathname` setter — when the application sets the path (e.g., when navigating a file browser), the terminal is notified.
- **Clipboard already partially works.** OSC 52 clipboard write is implemented (used by caret copy). Clipboard read (OSC 52 query) is supported by some terminals — we add capability detection and a fallback.
- **BEL as notification fallback.** When the terminal doesn't support OSC 9/777 notifications, `new Notification('title')` falls back to BEL (`\x07`) — the universal terminal alert sound.

**Terminal escape sequence reference:**

| Sequence         | Purpose                          | Web API mapping                        |
| ---------------- | -------------------------------- | -------------------------------------- |
| OSC 2            | Set window/tab title             | `document.title` / `<title>`           |
| OSC 7            | Report CWD                       | `window.location.pathname`             |
| OSC 8            | Hyperlinks (already implemented) | `<a href>` click → open in browser     |
| OSC 9            | iTerm2/Konsole notification      | `new Notification()`                   |
| OSC 777          | rxvt-unicode notification        | `new Notification()` fallback          |
| OSC 10           | Query foreground color           | `matchMedia('(prefers-color-scheme)')` |
| OSC 11           | Query background color           | `matchMedia('(prefers-color-scheme)')` |
| OSC 52           | Clipboard read/write             | `navigator.clipboard`                  |
| BEL `\x07`       | System bell                      | `Notification` fallback                |
| CSI cursor style | Cursor shape                     | CSS `cursor` property                  |

---

## Issues

### M13T1: Document title and window title

**Summary**

Wire `document.title` and `<title>` element changes to the terminal's window title via OSC 2. When the document title changes, the terminal's window/tab title updates to match — the same behavior as a browser.

**Expected Outcomes**

- `document.title` getter/setter is implemented on `Document` — gets/sets the text content of the first `<title>` element in `<head>`, creating one if it doesn't exist
- When `<title>` text content changes (via `document.title` setter, direct `textContent` mutation, or DOM parsing from M10), the terminal emits `\x1b]2;{title}\x07` (OSC 2)
- The hooks bridge detects `<title>` text changes and notifies the terminal layer (similar to how `<style>` changes notify the style engine)
- On terminal exit, the original title is restored (if the terminal supports title stack push/pop via OSC 22/23) or left as-is
- Unit tests verify: `document.title` get/set, `<title>` element creation, OSC 2 emission on change
- Integration tests verify: title updates are visible in the ANSI output stream

**Dependencies**

- M1T3: Document class (being extended)
- M1T5: Hooks bridge (text change detection)
- M1T26: TerminalManager (emits escape sequences)

---

### M13T2: Anchor hyperlinks and document focus state

**Summary**

Wire `<a href="...">` elements to render as clickable terminal hyperlinks using OSC 8 (already implemented in the ANSI writer), and implement `document.hasFocus()` and `document.visibilityState` based on terminal focus events.

**Expected Outcomes**

- When an `<a>` element with an `href` attribute is painted, its text cells have the `hyperlink` field set to the `href` value — the existing `ANSIWriter.serializeHyperlink()` handles the OSC 8 output
- The `Painter` reads the `href` attribute from `<a>` elements during the paint phase and propagates it to the cell buffer
- Clicking a hyperlink in the terminal opens the URL in the OS default browser (this is handled by the terminal emulator, not by terminal-dom — the framework just emits the correct OSC 8 sequences)
- `document.hasFocus()` returns `true` when the terminal has focus, `false` when it doesn't — tracked from the existing window focus/blur events (M3T6)
- `document.visibilityState` returns `'visible'` when focused, `'hidden'` when not — a `visibilitychange` event is dispatched on `document` when the state changes
- Unit tests verify: `hyperlink` field is set on cells for `<a href>` elements, `hasFocus()` reflects focus state, `visibilityState` changes dispatch events

**Dependencies**

- M1T22: Painter (propagates hyperlink to cells)
- M1T24: ANSI writer (already has OSC 8 support)
- M3T6: Window focus/blur events (drives hasFocus/visibilityState)

---

### M13T3: Window dialogs — alert, confirm, prompt

**Summary**

Implement `window.alert()`, `window.confirm()`, and `window.prompt()` as async methods that render modal dialogs using the existing `<dialog>` element, `<button>`, and `<input>` components. These are the iconic browser dialog APIs adapted for terminal interaction.

**Expected Outcomes**

- `window.alert(message)` returns a `Promise<void>` that resolves when the user presses Enter or clicks OK
  - Renders a `<dialog>` with the message text and an OK button
  - The dialog is modal — it captures keyboard focus, other elements are not interactive
  - Enter or Escape dismisses the dialog
- `window.confirm(message)` returns a `Promise<boolean>` — `true` for OK, `false` for Cancel
  - Renders a `<dialog>` with the message, an OK button, and a Cancel button
  - Enter confirms, Escape cancels, Tab switches between buttons
- `window.prompt(message, defaultValue?)` returns a `Promise<string | null>` — the input text, or `null` if cancelled
  - Renders a `<dialog>` with the message, a text `<input>` (pre-filled with `defaultValue`), OK, and Cancel
  - Enter submits, Escape cancels
- All three dialogs:
  - Are styled with sensible defaults (border, padding, centered positioning)
  - Remove themselves from the DOM when dismissed
  - Restore focus to the previously focused element after dismissal
  - Work without any component registration — they use raw `createElement` calls for the internal elements, or rely on `<dialog>` (which is a built-in DOM infrastructure element)
- Unit tests verify: each dialog renders, keyboard interaction, return values, focus restoration
- Integration tests verify: dialog renders in the terminal, user input is captured

**Dependencies**

- M1T3: Document (element creation)
- M3T4: Focus management (modal focus trapping, focus restoration)
- Existing `HTMLDialogElement` in `src/dom/classes/` (the `<dialog>` element)

---

### M13T4: Notification API

**Summary**

Implement the `Notification` Web API backed by terminal notification escape sequences. When a terminal-dom app creates a notification, the terminal emits OS-level desktop notifications via the appropriate protocol.

**Expected Outcomes**

- `Notification` class exists in `src/dom/classes/` with the standard Web API shape
- Constructor: `new Notification(title, { body?, icon? })` — `icon` is ignored in terminal context
- `Notification.permission` static property returns `'granted'` (terminal apps don't need permission — the terminal handles notification display)
- `Notification.requestPermission()` returns `Promise.resolve('granted')` (no permission prompt needed)
- Instance events: `onclick`, `onclose`, `onerror`, `onshow`
- On construction, emits OSC 9 (`\x1b]9;{title}: {body}\x07`) for iTerm2/Konsole, or OSC 777 (`\x1b]777;notify;{title};{body}\x07`) for rxvt-unicode
- Terminal notification capability is detected during `TerminalManager.detectCapabilities()` — added to `TerminalCapabilities`
- Fallback when no notification protocol is supported: emit BEL (`\x07`) for an audible alert
- `close()` method is a no-op (terminal notifications are transient — the OS manages their lifecycle)
- `Notification` is exposed on `Window` as `window.Notification`
- Unit tests verify: construction, escape sequence output for each protocol, fallback to BEL, static permission methods

**Dependencies**

- M1T3: Window class (exposed as `window.Notification`)
- M4T5: Terminal capability detection (extended for notification support)

---

### M13T5: Clipboard API

**Summary**

Implement `navigator.clipboard` with `writeText()` and `readText()` backed by OSC 52. Clipboard write is already functional (the caret system uses OSC 52 for copy). This task formalizes it as the standard `Clipboard` API and adds read support with capability detection.

**Expected Outcomes**

- `Clipboard` class exists in `src/dom/classes/` implementing the standard `navigator.clipboard` API shape
- `navigator.clipboard` returns a `Clipboard` instance instead of `null` (current behavior)
- `writeText(text)` returns `Promise<void>` — emits OSC 52 clipboard write sequence (`\x1b]52;c;{base64}\x07`), same as the existing implementation in `Terminal.writeToClipboard()`
- `readText()` returns `Promise<string>` — emits OSC 52 clipboard read query (`\x1b]52;c;?\x07`), waits for the terminal's response, parses the base64 payload
- Clipboard read capability is detected during capability detection — not all terminals support OSC 52 read
- When read is not supported, `readText()` returns the last value written via `writeText()` in the current session (in-memory fallback — same as the existing `clipboardBuffer` in `Terminal`)
- The existing `Terminal.writeToClipboard()` and `clipboardBuffer` are refactored to delegate to `navigator.clipboard`
- Unit tests verify: `writeText` emits correct OSC 52, `readText` parses response, in-memory fallback

**Dependencies**

- M1T3: Window / Navigator classes
- M4T5: Terminal capability detection (extended for OSC 52 read)

---

### M13T6: Color scheme detection via matchMedia

**Summary**

Implement `window.matchMedia()` with support for `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)`. The terminal's background color is queried via OSC 11, and its luminance determines the color scheme. This gives web developers the exact same API they use for dark/light mode detection.

**Expected Outcomes**

- `window.matchMedia(query)` is implemented on `Window` — returns a `MediaQueryList` object
- `MediaQueryList` has: `matches` (boolean), `media` (the query string), `addEventListener('change', ...)`, `removeEventListener`
- Supported queries:
  - `(prefers-color-scheme: dark)` — matches when terminal background luminance is below threshold
  - `(prefers-color-scheme: light)` — matches when terminal background luminance is above threshold
- Terminal background color is queried via OSC 11 (`\x1b]11;?\x07`) during capability detection — the terminal responds with the RGB color
- Background luminance is computed from the RGB response using relative luminance formula
- If the terminal doesn't respond to OSC 11, defaults to `dark` (most terminals are dark-themed)
- When the terminal's color scheme changes (e.g., user switches macOS appearance), a new OSC 11 query can be triggered — the `MediaQueryList` dispatches a `change` event if the result differs
- Unsupported media queries return `{ matches: false, media: query }` (matching browser behavior for unknown queries)
- `MediaQueryList` class exists in `src/dom/classes/`
- Unit tests verify: dark/light detection from known RGB values, `matches` property, `change` event dispatch, unsupported query fallback

**Dependencies**

- M1T3: Window class (exposed as `window.matchMedia`)
- M4T5: Terminal capability detection (OSC 11 query)

---

### M13T7: CWD reporting via window.location

**Summary**

Wire `window.location.pathname` changes to OSC 7, which reports the current working directory to the terminal. This enables terminal features like "Open New Tab Here" in iTerm2, Kitty, WezTerm, and GNOME Terminal.

**Expected Outcomes**

- When `window.location.pathname` is set, the terminal emits OSC 7 (`\x1b]7;file://{hostname}/{path}\x07`)
- On `Terminal.run()` startup, an initial OSC 7 is emitted with `process.cwd()` as the default path
- `window.location.href` is initialized to `file://{hostname}/{cwd}` instead of `about:blank` (providing a meaningful default)
- Applications that navigate directories (file browsers, project explorers) can update `window.location.pathname` and the terminal's "New Tab Here" feature follows
- Unit tests verify: OSC 7 emission on pathname change, initial emission on startup, correct URL formatting

**Dependencies**

- M1T3: Window / Location classes
- M1T26: TerminalManager (emits escape sequences)

---

### M13T8: CSS cursor property to terminal cursor style

**Summary**

Map the CSS `cursor` property to terminal cursor shape changes. When the focused element has a `cursor` style, the terminal cursor shape updates to match — providing visual feedback for different interaction modes.

**Expected Outcomes**

- The CSS property `cursor` is added to the supported property subset (not animatable, not inherited — set per element)
- Supported values and their terminal cursor mappings:
  - `default` → block cursor (CSI 2 SP q)
  - `text` → bar/beam cursor (CSI 6 SP q)
  - `pointer` → block cursor (CSI 2 SP q)
  - `wait` → blinking block cursor (CSI 1 SP q)
  - `none` → hidden cursor (CSI ? 25 l)
- The cursor style is resolved from `document.activeElement`'s computed `cursor` value
- When focus changes, the cursor style updates to match the newly focused element
- On `Terminal.exit()`, the cursor style is restored to the terminal's default
- When no `cursor` property is set, the cursor remains hidden (current default behavior)
- Unit tests verify: correct CSI sequences for each cursor value, focus-change updates, cleanup on exit

**Dependencies**

- M1T15: StyleEngine (new CSS property)
- M3T4: Focus management (cursor follows focus)
- M1T26: TerminalManager (cursor escape sequences)

---
