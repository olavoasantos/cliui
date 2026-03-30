# Component Roster — Implementation Issues

> Issues for components listed in `.ignore/components-roster.md` that are not yet implemented. Organized by tier, with each issue describing the component's purpose, API surface, interaction model, and reference files.
>
> **Existing components** (already implemented): `ui-spinner`, `ui-progress`, `ui-input`, `ui-button`, `ui-textarea`, `ui-select` (+ `ui-option`), `ui-details` (+ `ui-summary`), `ui-table` (+ `ui-thead`, `ui-tbody`, `ui-tfoot`, `ui-tr`, `ui-th`, `ui-td`), `ui-codeblock`.

---

## Tier 0: Platform Vocabulary — Default Element Styles

### COMP-1: User-agent stylesheet for semantic HTML elements

**Priority:** High  
**Depends on:** —

#### Problem

When users create elements like `document.createElement('h1')` or `document.createElement('strong')`, they render identically to a `<div>` — no bold, no block display, no visual distinction. Browsers ship a "user-agent stylesheet" that provides default styles for all HTML elements. We have none.

This means frameworks that generate semantic HTML (Preact, Vue, Solid rendering `<p>`, `<h1>`, `<strong>`, etc.) produce visually flat output with no structure.

#### Approach

Create a user-agent stylesheet that is automatically injected into every `Document` instance by the `StyleEngine`. This stylesheet provides sensible terminal defaults for semantic elements and has the lowest specificity (overridable by any user stylesheet or inline style).

**Block-level elements** (`display: block`, i.e. flex column):
`h1`–`h6`, `p`, `blockquote`, `pre`, `hr`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `hgroup`, `div`

**Inline elements** (`display: inline`, i.e. flex row wrap):
`span`, `a`, `strong`, `em`, `b`, `i`, `u`, `s`, `code`, `kbd`, `samp`, `var`, `mark`, `q`, `cite`, `abbr`, `time`, `br`, `wbr`

**Text styling defaults:**
- `strong`, `b` → `font-weight: bold`
- `em`, `i` → `font-style: italic`
- `u` → `text-decoration: underline`
- `s` → `text-decoration: line-through`
- `code`, `kbd`, `samp`, `var` → (no special font in terminal — all monospace — but could use dim/color)
- `mark` → `background-color` highlight
- `h1`–`h6` → `font-weight: bold`
- `pre` → `white-space: pre`
- `a` → `text-decoration: underline; color: <link color>`
- `hr` → 1-row border element

**Layout defaults:**
- `ul`, `ol` → `padding-left: 2` (indentation for list items)
- `blockquote` → `padding-left: 2`
- `br` → forces a line break (needs special handling in text layout or as a zero-height block)

#### Files to create or modify

- `src/css/constants/userAgentStylesheet.ts` — the UA stylesheet as a CSS string constant.
- `src/css/classes/StyleEngine.ts` — inject the UA stylesheet at lowest priority when attaching to a document.
- `src/css/classes/specs/StyleEngine.unit.ts` — tests verifying UA styles apply, are overridable by user styles.
- `src/css/classes/specs/StyleEngine.integration.ts` — integration tests with actual DOM trees using semantic elements.

#### Expected outcomes

- `document.createElement('h1')` renders bold text.
- `document.createElement('strong')` wrapping text makes it bold.
- `document.createElement('p')` is block-level with vertical spacing.
- User stylesheets override UA defaults at any specificity.
- Frameworks producing semantic HTML get reasonable visual output by default.

---

### COMP-2: `<a>` hyperlink element with OSC 8 support

**Priority:** Medium  
**Depends on:** COMP-1

#### Problem

The `<a>` element should render as a clickable hyperlink in the terminal. The renderer already supports OSC 8 hyperlink escape sequences (`hyperlink` field on `Cell`), but there's no way to set it from the DOM. An `<a href="...">` element should propagate its `href` to the cell's hyperlink field so terminal emulators can make it clickable.

#### Approach

1. Add a lightweight `HTMLAnchorElement` class (or handle in the painter) that reads the `href` attribute.
2. During painting, when a text cell belongs to an `<a>` element with an `href`, set `cell.hyperlink` to the href value.
3. UA stylesheet gives `a` elements `text-decoration: underline` and a link color.

#### Files to create or modify

- `src/dom/classes/HTMLAnchorElement.ts` — minimal element class (or skip if the Painter can read `href` directly from any element).
- `src/dom/utilities/createElement.ts` — map `'a'` to the anchor class.
- `src/renderer/classes/Painter.ts` — propagate `href` to `cell.hyperlink` during text painting.
- Tests for hyperlink rendering.

#### Expected outcomes

- `<a href="https://example.com">link</a>` renders as underlined text.
- The terminal emulator makes it clickable (OSC 8 sequences emitted).
- Hyperlink URL appears in the ANSI output.

---

### COMP-3: `<br>` and `<wbr>` line break elements

**Priority:** Medium  
**Depends on:** COMP-1

#### Problem

`<br>` should force a line break within text content. `<wbr>` should suggest a word-break opportunity. Neither exists today — inserting a `<br>` does nothing because it's just a generic element.

#### Approach

Handle `<br>` in `LayoutEngine.collectChildren()` — when a `<br>` element is encountered among text nodes, insert a `\n` into the text stream. For `<wbr>`, insert a zero-width break opportunity (`\u200B`).

#### Files to create or modify

- `src/layout/classes/LayoutEngine.ts` — handle `br` and `wbr` tag names during text collection.
- `src/layout/classes/specs/LayoutEngine.unit.ts` — tests for `<br>` line breaks.
- `src/layout/classes/specs/LayoutEngine.integration.ts` — integration tests with mixed text and `<br>` elements.

#### Expected outcomes

- `<span>hello<br>world</span>` renders on two lines.
- `<wbr>` allows line breaks at its position without visible content.

---

### COMP-4: `<hr>` horizontal rule element

**Priority:** Low  
**Depends on:** COMP-1

#### Problem

`<hr>` should render a horizontal divider line spanning the container width. Common in terminal UIs for section separation.

#### Approach

Handle in the UA stylesheet and/or a minimal `HTMLHRElement`. The element should be block-level with `height: 1` and render a horizontal line character (`─` repeated to fill width) via the Painter.

#### Files to create or modify

- `src/css/constants/userAgentStylesheet.ts` — add `hr` styles.
- `src/renderer/classes/Painter.ts` — detect `hr` elements and paint a horizontal line.
- Tests.

#### Expected outcomes

- `<hr>` renders a horizontal line spanning the parent's content width.

---

## Tier 1: Core Terminal Controls

### COMP-5: `<ui-label>` form label component

**Priority:** High  
**Depends on:** —

#### Problem

Form fields need visible labels. A `<ui-label>` with a `for` attribute should associate with an input by ID and forward clicks/focus to the target input.

#### Approach

Simple custom element. When clicked, find the element matching the `for` attribute and call `focus()` on it. UA-style: block display, text styling.

#### Files to create or modify

- `src/components/UiLabel/component.ts` — custom element with `for` attribute handling.
- `src/components/UiLabel/constants.ts` — tag name, observed attributes.
- `src/components/UiLabel/types.ts` — attribute types.
- `src/components/UiLabel/styles.css` — default styles.
- `src/components/UiLabel/specs/UiLabel.unit.ts` — tests.
- **Reference:** `src/components/UiButton/` for the simple component pattern.

#### Expected outcomes

- `<ui-label for="name">Name:</ui-label>` renders text.
- Clicking the label focuses the associated input.

---

### COMP-6: `<ui-fieldset>` and `<ui-form>` form grouping components

**Priority:** Medium  
**Depends on:** —

#### Problem

Forms need structural grouping. `<ui-fieldset>` groups related fields with an optional border and legend. `<ui-form>` is a semantic container that can emit `submit` events.

#### Approach

- `<ui-fieldset>` — block-level container with an optional `legend` attribute rendered as a title in the border. Similar to `<ui-details>` but non-collapsible.
- `<ui-form>` — semantic block container. Dispatches a `submit` event when a child `<ui-button>` with `type="submit"` is activated. Provides `reset()` to clear child inputs.

#### Files to create or modify

- `src/components/UiFieldset/` — component folder (component, constants, types, styles, specs).
- `src/components/UiForm/` — component folder.
- **Reference:** `src/components/UiDetails/` for bordered container with header pattern.

#### Expected outcomes

- `<ui-fieldset legend="Personal Info">...</ui-fieldset>` renders a bordered group.
- `<ui-form>` dispatches `submit` on Enter in child inputs or button activation.

---

### COMP-7: `<ui-optgroup>` option group component

**Priority:** Medium  
**Depends on:** —

#### Problem

`<ui-select>` has no support for grouped options. `<ui-optgroup label="Fruits">` should render a non-selectable group header in the dropdown.

#### Approach

Custom element that renders its `label` attribute as a styled non-interactive header row in the select dropdown. `<ui-select>` skips optgroup elements during keyboard navigation.

#### Files to create or modify

- `src/components/UiOptgroup/` — component folder.
- `src/components/UiSelect/component.ts` — update option iteration to handle optgroup children.
- **Reference:** `src/components/UiOption/` for the option pattern.

#### Expected outcomes

- `<ui-optgroup label="Fruits"><ui-option>Apple</ui-option></ui-optgroup>` renders a group header.
- Group headers are not selectable or highlightable.

---

### COMP-8: `<ui-meter>` gauge component

**Priority:** Low  
**Depends on:** —

#### Problem

A meter element displays a scalar value within a known range (e.g., disk usage, battery level). Unlike `<ui-progress>` which shows task completion, `<ui-meter>` shows a static measurement with color-coded thresholds (low/optimum/high).

#### Approach

Custom element with `value`, `min`, `max`, `low`, `high`, `optimum` attributes. Renders a horizontal bar with color coding based on where the value falls relative to the thresholds.

#### Files to create or modify

- `src/components/UiMeter/` — component folder.
- **Reference:** `src/components/UiProgress/` for the bar rendering pattern.

#### Expected outcomes

- `<ui-meter value="0.7" low="0.3" high="0.8" optimum="0.5">` renders a colored bar.
- Color changes based on value vs threshold positions.

---

### COMP-9: `<dialog>` platform dialog element

**Priority:** High  
**Depends on:** COMP-1

#### Problem

Terminal apps need modal dialogs for confirmations, alerts, and forms. The HTML `<dialog>` element has well-defined semantics — `open` attribute, `showModal()`, `close(returnValue)`, focus trapping, Escape to close — and belongs in the DOM layer as platform vocabulary, not as a `ui-*` component.

Higher-level components (`ui-confirmation`, `ui-prompt`, `ui-alert`) should compose a `<dialog>` internally rather than reimplementing modal behavior from scratch.

#### Approach

1. Add `HTMLDialogElement` class to the DOM layer with:
   - `open` attribute (reflects the open/closed state)
   - `showModal()` — opens the dialog, traps focus, adds to a "top layer" rendering context
   - `show()` — opens non-modally (no focus trap, no backdrop)
   - `close(returnValue?)` — closes the dialog, restores previous focus, dispatches `close` event
   - `returnValue` property — the string passed to `close()`
   - Escape key closes modal dialogs (dispatches `cancel` then `close`)
2. Register `'dialog'` in `createElement()` to map to the new class.
3. Add UA stylesheet rules: `dialog { display: none; position: absolute; }` `dialog[open] { display: block; }`.
4. Focus trapping: Tab/Shift+Tab cycles within the dialog's focusable descendants when modal.
5. Backdrop: when `showModal()` is used, a backdrop element is painted behind the dialog (full-viewport dim overlay).

#### Files to create or modify

- `src/dom/classes/HTMLDialogElement.ts` — the dialog DOM class with `showModal()`, `show()`, `close()`, focus trapping, Escape handling.
- `src/dom/utilities/createElement.ts` — map `'dialog'` to `HTMLDialogElement`.
- `src/css/constants/userAgentStylesheet.ts` — add `dialog` default styles (hidden when not open, centered when open).
- `src/dom/classes/specs/HTMLDialogElement.unit.ts` — unit tests.
- `src/dom/classes/specs/HTMLDialogElement.integration.ts` — integration tests with focus trapping and event dispatch.
- **Reference:** `.ignore/references/happy-dom/` for the `HTMLDialogElement` API shape. `src/components/UiDetails/` for open/close state management pattern.

#### Expected outcomes

- `dialog.showModal()` opens the dialog centered with focus trapped inside.
- Tab cycles focus within the dialog only.
- Escape closes the dialog, dispatching `cancel` then `close` events.
- `dialog.close('ok')` sets `returnValue` and dispatches `close`.
- `<dialog>` is hidden by default, shown when `open` attribute is present.
- Higher-level `ui-confirmation`, `ui-prompt` components can compose this element.

---

## Tier 2: Status and Feedback

### COMP-10: `<ui-alert>` inline alert component

**Priority:** High  
**Depends on:** —

#### Problem

Terminal apps need inline alerts for success, warning, error, and info messages. An alert is a non-interactive, styled block with an icon/indicator and a message.

Note: this is an **inline** alert, not a modal. For modal alerts, compose a `<dialog>` (COMP-9) with alert content.

#### Approach

Custom element with `variant` attribute (`info`, `success`, `warning`, `error`). Renders with a colored left border or background, an optional icon prefix (e.g., `✓`, `⚠`, `✗`, `ℹ`), and text content.

#### Files to create or modify

- `src/components/UiAlert/` — component folder.
- **Reference:** `src/components/UiButton/` for variant-based styling.

#### Expected outcomes

- `<ui-alert variant="error">Something went wrong</ui-alert>` renders a red-bordered error message.
- Different variants produce different colors and icons.

---

### COMP-11: `<ui-badge>` inline badge component

**Priority:** Medium  
**Depends on:** —

#### Problem

Badges display short status labels (e.g., "NEW", "3", "BETA") typically with a colored background. Common in terminal dashboards for status indicators.

#### Approach

Inline custom element with `variant` attribute for color presets. Renders as a compact, padded inline element.

#### Files to create or modify

- `src/components/UiBadge/` — component folder.
- **Reference:** `src/components/UiButton/` for inline variant styling.

#### Expected outcomes

- `<ui-badge variant="success">Active</ui-badge>` renders a green-background label.
- Compact inline rendering suitable for use within text or table cells.

---

### COMP-12: `<ui-toast>` notification toast component

**Priority:** Medium  
**Depends on:** —

#### Problem

Toasts are temporary notifications that appear at the screen edge and auto-dismiss. Common for "saved", "copied", "error" feedback.

#### Approach

Custom element with `variant` and `duration` attributes. Positions itself absolutely at the bottom-right (or configurable corner). Auto-removes itself from the DOM after `duration` ms. Implements `TerminalFrameAware` for the countdown timer.

#### Files to create or modify

- `src/components/UiToast/` — component folder.
- **Reference:** `src/components/UiSpinner/` for `TerminalFrameAware` frame-based timing.

#### Expected outcomes

- `<ui-toast variant="success" duration="3000">Saved!</ui-toast>` appears and disappears after 3s.
- Multiple toasts stack vertically.

---

### COMP-13: `<ui-confirmation>` confirmation dialog component

**Priority:** Medium  
**Depends on:** COMP-9

#### Problem

A specialized dialog for yes/no confirmations. Composes a platform `<dialog>` element with a message, confirm button, and cancel button.

#### Approach

Custom element that internally creates a `<dialog>` (via `document.createElement('dialog')`) with a message and two buttons. Opens with `showModal()`. Provides `confirm()` returning a Promise that resolves to `true` (confirmed) or `false` (cancelled). Focus trapping, Escape handling, and backdrop are inherited from the `<dialog>` element.

#### Files to create or modify

- `src/components/UiConfirmation/` — component folder.
- **Reference:** `src/dom/classes/HTMLDialogElement.ts` (COMP-9) for the underlying dialog.

#### Expected outcomes

- `const ok = await confirmation.confirm()` — shows modal dialog, waits for user choice.
- Enter confirms, Escape cancels.
- Focus is trapped within the dialog while open.

---

### COMP-14: `<ui-prompt>` text prompt dialog component

**Priority:** Medium  
**Depends on:** COMP-9

#### Problem

A specialized dialog for text input. Composes a platform `<dialog>` element with a message, a `<ui-input>`, and confirm/cancel buttons.

#### Approach

Custom element that internally creates a `<dialog>` with an embedded input field. Opens with `showModal()`. Provides `prompt(message)` returning a Promise that resolves to the entered string or `null` on cancel. Focus trapping and Escape handling are inherited from `<dialog>`.

#### Files to create or modify

- `src/components/UiPrompt/` — component folder.
- **Reference:** `src/dom/classes/HTMLDialogElement.ts` (COMP-9), `src/components/UiInput/`.

#### Expected outcomes

- `const name = await prompt.prompt('Enter name:')` — shows modal dialog with input field.
- Enter confirms with current value, Escape cancels with `null`.
- Focus starts on the input field.

---

### COMP-15: `<ui-statusline>` status bar component

**Priority:** Medium  
**Depends on:** —

#### Problem

Terminal apps commonly have a status bar at the bottom showing mode, file info, cursor position, etc. A statusline component positions itself at the bottom of the viewport and lays out child segments horizontally.

#### Approach

Custom element that uses `position: absolute; bottom: 0; left: 0; width: 100%`. Children are laid out in a flex row. Supports left-aligned, center-aligned, and right-aligned segments via child attributes.

#### Files to create or modify

- `src/components/UiStatusline/` — component folder.
- **Reference:** `.ignore/references/glow/` for statusline patterns.

#### Expected outcomes

- `<ui-statusline>` renders at the bottom of the terminal.
- Children spread horizontally across the full width.

---

### COMP-16: `<ui-skeleton>` loading placeholder component

**Priority:** Low  
**Depends on:** —

#### Problem

Skeleton screens show placeholder shapes where content will appear, indicating loading state. In terminal, this means rendering dim/pulsing block characters in the shape of the expected content.

#### Approach

Custom element with `width` and `height` attributes. Renders dim block characters (`░` or `▒`) with optional animation pulsing between two dim levels. Implements `TerminalFrameAware` for animation.

#### Files to create or modify

- `src/components/UiSkeleton/` — component folder.
- **Reference:** `src/components/UiSpinner/` for frame-based animation pattern.

#### Expected outcomes

- `<ui-skeleton width="20" height="3">` renders a pulsing placeholder block.

---

## Tier 3: Data Display and Authoring

### COMP-17: `<ui-list>` interactive list component

**Priority:** High  
**Depends on:** —

#### Problem

An interactive list with keyboard navigation (arrow keys to highlight, Enter to select). Unlike `<ul>`/`<li>` which are purely structural, `<ui-list>` manages focus, highlighting, and selection.

#### Approach

Custom element that manages a list of child elements. Arrow keys move a highlight cursor. Enter dispatches a `select` event with the highlighted item. Supports single and multi-select modes.

#### Files to create or modify

- `src/components/UiList/` — component folder.
- **Reference:** `src/components/UiSelect/` for the arrow-key navigation and highlight pattern.

#### Expected outcomes

- Arrow keys move the highlight.
- Enter selects the highlighted item.
- `select` event fires with the selected value.

---

### COMP-18: `<ui-tree>` tree view component

**Priority:** Medium  
**Depends on:** —

#### Problem

File explorers, JSON viewers, and dependency trees need a collapsible tree structure. Each node can be expanded/collapsed, with indentation showing hierarchy.

#### Approach

Custom element with `<ui-tree-item>` children. Each item has an optional `expandable` attribute. Arrow left/right expands/collapses. Arrow up/down navigates. Indentation is automatic based on nesting depth.

#### Files to create or modify

- `src/components/UiTree/` — component folder.
- `src/components/UiTreeItem/` — child element.
- **Reference:** `src/components/UiDetails/` for expand/collapse, `src/components/UiSelect/` for keyboard navigation.

#### Expected outcomes

- Nested tree items render with indentation.
- Arrow keys navigate and expand/collapse nodes.
- `select` event fires on Enter.

---

### COMP-19: `<ui-log>` scrollable log viewer component

**Priority:** Medium  
**Depends on:** —

#### Problem

Terminal apps often display scrollable log output — a region that auto-scrolls to the bottom as new lines are added, but allows scrolling up to review history.

#### Approach

Custom element with `overflow: scroll`. Auto-scrolls to bottom when new children are appended (unless the user has scrolled up). Provides `append(text)` for convenience.

#### Files to create or modify

- `src/components/UiLog/` — component folder.
- **Reference:** `.ignore/references/bubbles/viewport/` for scrollable content patterns.

#### Expected outcomes

- New content auto-scrolls to bottom.
- User can scroll up to review; auto-scroll resumes when scrolled back to bottom.
- Efficient for large amounts of appended text.

---

### COMP-20: `<ui-markdown>` Markdown renderer component

**Priority:** Low  
**Depends on:** COMP-1

#### Problem

Rendering Markdown content in the terminal — headings, bold, italic, lists, code blocks, links. Useful for help text, README display, and documentation viewers.

#### Approach

Custom element that parses its `textContent` as Markdown and renders it using semantic HTML elements with UA stylesheet styling. Uses a lightweight Markdown parser (or accepts pre-parsed AST). Could integrate with `<ui-codeblock>` for fenced code blocks.

#### Files to create or modify

- `src/components/UiMarkdown/` — component folder.
- **Reference:** `.ignore/references/glow/` for terminal Markdown rendering, `src/components/UiCodeblock/` for code block integration.

#### Expected outcomes

- Markdown headings render bold.
- `**bold**` renders bold, `*italic*` renders italic.
- Code blocks render with `<ui-codeblock>` syntax highlighting.

---

### COMP-21: `<ui-diff>` diff viewer component

**Priority:** Low  
**Depends on:** —

#### Problem

Displaying file diffs with added/removed/modified line highlighting. Common in code review, version control, and deployment tools.

#### Approach

Custom element that accepts diff text (unified diff format) and renders it with color-coded lines: green for additions, red for deletions, gray for context. Supports line numbers.

#### Files to create or modify

- `src/components/UiDiff/` — component folder.
- **Reference:** `src/components/UiCodeblock/` for line-numbered, syntax-colored display.

#### Expected outcomes

- Unified diff format renders with color-coded added/removed lines.
- Line numbers on both sides (old/new).

---

## Tier 4: Navigation and Application Shell

### COMP-22: `<ui-tabs>` tabbed container component

**Priority:** High  
**Depends on:** —

#### Problem

Tabbed interfaces are fundamental for terminal apps with multiple views. A tab bar at the top with keyboard-navigable tabs, and a content area that shows only the active tab's content.

#### Approach

Custom element with `<ui-tab>` children for tab headers and `<ui-tab-panel>` children for content. Arrow left/right navigates tabs. The active tab is tracked via attribute. Only the active panel is displayed (`display: none` on inactive panels).

#### Files to create or modify

- `src/components/UiTabs/` — container component.
- `src/components/UiTab/` — individual tab header element.
- `src/components/UiTabPanel/` — tab content panel element.
- **Reference:** `src/components/UiSelect/` for arrow-key navigation between items.

#### Expected outcomes

- Arrow keys switch between tabs.
- Only the active panel is visible.
- `change` event fires on tab switch.

---

### COMP-23: `<ui-card>` content card component

**Priority:** Medium  
**Depends on:** —

#### Problem

Cards are bordered content containers with optional header/footer sections. Common for dashboard widgets, info panels, and grouped content.

#### Approach

Custom element with a border, optional `header` and `footer` slot-like regions. Children are laid out in a flex column. The header renders at the top with a separator, footer at the bottom.

#### Files to create or modify

- `src/components/UiCard/` — component folder.
- **Reference:** `src/components/UiDetails/` for bordered container with internal structure.

#### Expected outcomes

- `<ui-card header="Stats">...</ui-card>` renders a bordered box with a header.

---

### COMP-24: `<ui-menu>` and `<ui-dropdown>` menu components

**Priority:** High  
**Depends on:** —

#### Problem

Dropdown menus triggered by a button or keybinding, with keyboard-navigable menu items. Common for context menus, action menus, and command palettes.

#### Approach

- `<ui-dropdown>` — a trigger element that opens a floating `<ui-menu>` on activation.
- `<ui-menu>` — a positioned list of `<ui-menu-item>` elements. Arrow keys navigate, Enter selects, Escape closes.

#### Files to create or modify

- `src/components/UiMenu/` — menu container.
- `src/components/UiMenuItem/` — individual menu item.
- `src/components/UiDropdown/` — trigger wrapper.
- **Reference:** `src/components/UiSelect/` for the dropdown + keyboard navigation pattern.

#### Expected outcomes

- Menu opens on trigger activation.
- Arrow keys navigate items, Enter selects, Escape closes.
- `select` event fires with the chosen item's value.

---

### COMP-25: `<ui-breadcrumbs>` navigation breadcrumbs component

**Priority:** Low  
**Depends on:** —

#### Problem

Breadcrumb navigation shows the current location in a hierarchy (e.g., `Home > Projects > terminal-dom`). Each segment is optionally interactive.

#### Approach

Custom element with `<ui-breadcrumb>` children. Renders segments inline with a separator character (default `>`). Individual segments can be focusable.

#### Files to create or modify

- `src/components/UiBreadcrumbs/` — container.
- `src/components/UiBreadcrumb/` — individual segment.

#### Expected outcomes

- Renders `Home > Projects > terminal-dom` with configurable separator.

---

### COMP-26: `<ui-paginator>` pagination component

**Priority:** Low  
**Depends on:** —

#### Problem

Paginated views need a page indicator and navigation controls (prev/next, page numbers).

#### Approach

Custom element with `page`, `total-pages` attributes. Renders `< 1 2 3 ... 10 >` with keyboard navigation. Arrow left/right changes page. Dispatches `change` event.

#### Files to create or modify

- `src/components/UiPaginator/` — component folder.
- **Reference:** `.ignore/references/bubbles/paginator/` for pagination patterns.

#### Expected outcomes

- Renders page numbers with prev/next controls.
- Arrow keys navigate, `change` event fires.

---

### COMP-27: `<ui-sidebar>` resizable sidebar component

**Priority:** Low  
**Depends on:** —

#### Problem

Application shells often have a collapsible sidebar for navigation or file trees. The sidebar should be resizable and collapsible.

#### Approach

Custom element with `width`, `collapsed` attributes. Renders as a fixed-width panel on the left (or right) side. Toggle collapse with a keybinding or method call.

#### Files to create or modify

- `src/components/UiSidebar/` — component folder.

#### Expected outcomes

- `<ui-sidebar width="30">...</ui-sidebar>` renders a fixed-width panel.
- `collapsed` attribute hides the sidebar content.

---

### COMP-28: `<ui-toolbar>` toolbar component

**Priority:** Low  
**Depends on:** —

#### Problem

Toolbars group action buttons and controls in a horizontal bar, typically at the top of a view.

#### Approach

Custom element with flex-row layout. Children (buttons, selects, etc.) are laid out horizontally with gap spacing. Provides keyboard navigation between focusable children.

#### Files to create or modify

- `src/components/UiToolbar/` — component folder.
- **Reference:** `src/components/UiButton/` for toolbar item styling.

#### Expected outcomes

- Children render in a horizontal row with spacing.
- Tab/Shift+Tab navigates between toolbar items.
