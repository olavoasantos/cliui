# Milestone 11: Component Taxonomy Restructure — Issues

## Working Summary

Phase 11 restructures the component library from a flat `ui-*` namespace into three clear tiers: standard HTML elements with proper tag names, unstyled structural primitives without the `ui-` prefix, and opinionated styled components that keep the `ui-` prefix. This aligns the framework with web standards, eliminates the confusion of writing `<ui-table><ui-tr><ui-td>` when HTML has `<table><tr><td>`, and maximizes the value of Milestone 10's HTML entry points.

**Three tiers:**

1. **HTML elements** — proper tag names (`<button>`, `<input>`, `<table>`, etc.), user-agent default styles, standard DOM interfaces. Writing HTML should feel like writing HTML.
2. **Unstyled primitives** — descriptive unprefixed names (`<tabs>`, `<tree>`, `<navmenu>`, etc.), minimal structural styling, keyboard interaction. Building blocks with no visual opinions.
3. **Styled components** — `ui-*` prefix (`<ui-card>`, `<ui-badge>`, `<ui-codeblock>`, etc.), ship with colors, borders, animations. Opinionated and meant to be used as-is or themed.

**All three tiers are opt-in via registration helpers.** No components are automatically available — you register what you need:

```ts
import {
  registerHTMLElements,
  registerPrimitives,
  registerStyledComponents,
  registerAll,
} from '@cliui/terminal/components';

const terminal = new Terminal();

// Pick what you need
registerHTMLElements(terminal.window); // <button>, <input>, <table>, etc.
registerPrimitives(terminal.window); // <tabs>, <tree>, <navmenu>, etc.
registerStyledComponents(terminal.window); // <ui-card>, <ui-badge>, etc.

// Or everything
registerAll(terminal.window);
```

**Four groups of work:**

1. **Infrastructure (M11T1–M11T2):** User-agent stylesheet extension mechanism and registration helpers.
2. **HTML elements (M11T3–M11T8):** Rename and enhance existing `ui-*` components to use standard HTML tag names, add missing standard DOM properties. Implement `<img>` with terminal graphics protocol support.
3. **Primitives (M11T9–M11T10):** Rename `ui-*` primitives to descriptive unprefixed names.
4. **Integration (M11T11–M11T12):** Update `createElement` dispatch, exports, and migrate all tests.

**Key context and design decisions:**

- **CustomElementRegistry already accepts non-hyphenated names.** The existing implementation has no hyphen validation — `customElements.define('button', ButtonElement)` works today. No registry changes needed.
- **User-agent stylesheet already exists.** `src/css/constants/userAgentStylesheet.ts` provides default styles for semantic HTML elements (`h1`–`h6`, `p`, `pre`, `a`, `dialog`, etc.), injected as the first `<style>` in `<head>` for lowest cascade priority. Component default styles extend this.
- **Component style auto-injection already works.** When a custom element with `static readonly styles` connects to the document, its CSS is injected into `<head>` as a `<style data-custom-element-styles="tag-name">` element. This mechanism handles all three tiers.
- **The `createElement()` dispatch stays minimal.** Only DOM infrastructure elements remain hardcoded in the dispatch (`<style>`, `<template>`, `<a>`, `<dialog>`, and structural elements like `<html>`, `<head>`, `<body>`). Everything else routes through `customElements.get(name)`, returning a plain `Element` if nothing is registered.
- **Component source stays in `src/components/`.** All three tiers live in the same directory, following the existing component folder convention. Folder names match the class name (e.g., `Button/`, `Tabs/`, `UiCard/`).
- **HTML elements need standard DOM properties.** The current `UiButton` already handles `disabled` via attributes. But `<button>` should also have a `type` property, `<input>` should have a `value` property that reflects the attribute, `<select>` should have `selectedIndex` and `options`. These are added pragmatically — not full DOM spec compliance, but the properties developers expect.
- **`<menu>` is an HTML element; `<navmenu>` is the navigable primitive.** HTML's `<menu>` is semantically a list of commands (tier 1, low priority). The current `UiMenu` with keyboard navigation, highlight tracking, and selection becomes `<navmenu>` / `<navmenuitem>` (tier 2).
- **`<img>` is a new HTML element with terminal graphics protocol support.** No existing `ui-*` component to rename — this is a new implementation. The `<img>` element participates in layout like any other box (width, height, flex item). At paint time, the renderer emits the appropriate graphics protocol (Kitty > iTerm2 > Sixel) or falls back to alt text / placeholder characters. Capability detection for graphics protocols is added to `TerminalManager`.

**Tier mapping:**

| Current          | Tier          | New tag name        | New class name               |
| ---------------- | ------------- | ------------------- | ---------------------------- |
| `UiButton`       | 1 – HTML      | `<button>`          | `Button`                     |
| `UiInput`        | 1 – HTML      | `<input>`           | `Input`                      |
| `UiTextarea`     | 1 – HTML      | `<textarea>`        | `Textarea`                   |
| `UiSelect`       | 1 – HTML      | `<select>`          | `Select`                     |
| `UiOption`       | 1 – HTML      | `<option>`          | `Option`                     |
| `UiOptgroup`     | 1 – HTML      | `<optgroup>`        | `Optgroup`                   |
| `UiTable`        | 1 – HTML      | `<table>`           | `Table`                      |
| `UiThead`        | 1 – HTML      | `<thead>`           | `Thead`                      |
| `UiTbody`        | 1 – HTML      | `<tbody>`           | `Tbody`                      |
| `UiTfoot`        | 1 – HTML      | `<tfoot>`           | `Tfoot`                      |
| `UiTr`           | 1 – HTML      | `<tr>`              | `Tr`                         |
| `UiTh`           | 1 – HTML      | `<th>`              | `Th`                         |
| `UiTd`           | 1 – HTML      | `<td>`              | `Td`                         |
| `UiForm`         | 1 – HTML      | `<form>`            | `Form`                       |
| `UiFieldset`     | 1 – HTML      | `<fieldset>`        | `Fieldset`                   |
| `UiLabel`        | 1 – HTML      | `<label>`           | `Label`                      |
| `UiMeter`        | 1 – HTML      | `<meter>`           | `Meter`                      |
| `UiProgress`     | 1 – HTML      | `<progress>`        | `Progress`                   |
| `UiDetails`      | 1 – HTML      | `<details>`         | `Details`                    |
| _(new)_          | 1 – HTML      | `<img>`             | `Img`                        |
| `UiTabs`         | 2 – Primitive | `<tabs>`            | `Tabs`                       |
| `UiTab`          | 2 – Primitive | `<tab>`             | `Tab`                        |
| `UiMenu`         | 2 – Primitive | `<navmenu>`         | `Navmenu`                    |
| `UiMenuItem`     | 2 – Primitive | `<navmenuitem>`     | `NavmenuItem`                |
| `UiTree`         | 2 – Primitive | `<tree>`            | `Tree`                       |
| `UiTreeItem`     | 2 – Primitive | `<treeitem>`        | `TreeItem`                   |
| `UiList`         | 2 – Primitive | `<listbox>`         | `Listbox`                    |
| `UiDropdown`     | 2 – Primitive | `<dropdown>`        | `Dropdown`                   |
| `UiToolbar`      | 2 – Primitive | `<toolbar>`         | `Toolbar`                    |
| `UiBreadcrumbs`  | 2 – Primitive | `<breadcrumbs>`     | `Breadcrumbs`                |
| `UiBreadcrumb`   | 2 – Primitive | `<breadcrumb>`      | `Breadcrumb`                 |
| `UiStatusline`   | 2 – Primitive | `<statusline>`      | `Statusline`                 |
| `UiPaginator`    | 2 – Primitive | `<paginator>`       | `Paginator`                  |
| `UiCard`         | 3 – Styled    | `<ui-card>`         | `UiCard` (unchanged)         |
| `UiBadge`        | 3 – Styled    | `<ui-badge>`        | `UiBadge` (unchanged)        |
| `UiMessage`      | 3 – Styled    | `<ui-message>`      | `UiMessage` (unchanged)      |
| `UiCodeblock`    | 3 – Styled    | `<ui-codeblock>`    | `UiCodeblock` (unchanged)    |
| `UiDiff`         | 3 – Styled    | `<ui-diff>`         | `UiDiff` (unchanged)         |
| `UiSkeleton`     | 3 – Styled    | `<ui-skeleton>`     | `UiSkeleton` (unchanged)     |
| `UiSpinner`      | 3 – Styled    | `<ui-spinner>`      | `UiSpinner` (unchanged)      |
| `UiToast`        | 3 – Styled    | `<ui-toast>`        | `UiToast` (unchanged)        |
| `UiConfirmation` | 3 – Styled    | `<ui-confirmation>` | `UiConfirmation` (unchanged) |
| `UiPrompt`       | 3 – Styled    | `<ui-prompt>`       | `UiPrompt` (unchanged)       |
| `UiSidebar`      | 3 – Styled    | `<ui-sidebar>`      | `UiSidebar` (unchanged)      |
| `UiLog`          | 3 – Styled    | `<ui-log>`          | `UiLog` (unchanged)          |

---

## Issues

### M11T1: User-agent stylesheet extension for registered components

**Summary**

Extend the user-agent stylesheet system so that registered components can contribute their default styles to the UA tier. Currently, component styles are injected via `<style data-custom-element-styles>` elements on first connect — these participate in the normal author cascade. For HTML elements, their default styles should sit at the user-agent tier (lowest priority) so that any user CSS overrides them without specificity concerns.

**Expected Outcomes**

- The existing `USER_AGENT_STYLESHEET` in `src/css/constants/` is extended to include default styles for HTML elements (tier 1) when they are registered — styles like `button { display: inline; font-weight: bold; padding: 0 1; }`, `table { display: block; }`, `tr { display: flex; flex-direction: row; }`, etc.
- A mechanism exists for registration helpers to append component-specific CSS to the user-agent stylesheet (or a parallel UA-priority stylesheet) rather than the author cascade
- Tier 1 (HTML elements) styles are injected at UA priority — any user `<style>` or inline style overrides them
- Tier 2 (primitives) styles are injected at UA priority — minimal structural defaults, easily overridden
- Tier 3 (styled components) styles remain in the author cascade (current behavior via `data-custom-element-styles`) — they are opinionated and the `ui-*` prefix signals intentional styling
- The style engine's cascade correctly resolves: UA defaults < author stylesheets < inline styles
- Unit tests verify: component UA styles are overridden by user `<style>` blocks, tier 3 styles participate in normal specificity, and styles are only present when the corresponding tier is registered

**Dependencies**

- M1T15: StyleEngine (manages stylesheets and cascade)

---

### M11T2: Registration helpers

**Summary**

Implement registration helper functions that register groups of components with a `Window` instance. Each helper registers the components for a tier, defining them in the custom element registry and injecting their default styles.

**Expected Outcomes**

- `registerHTMLElements(window)` registers all tier 1 components: `<button>`, `<input>`, `<textarea>`, `<select>`, `<option>`, `<optgroup>`, `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`, `<form>`, `<fieldset>`, `<label>`, `<meter>`, `<progress>`, `<details>`
- `registerPrimitives(window)` registers all tier 2 components: `<tabs>`, `<tab>`, `<navmenu>`, `<navmenuitem>`, `<tree>`, `<treeitem>`, `<listbox>`, `<dropdown>`, `<toolbar>`, `<breadcrumbs>`, `<breadcrumb>`, `<statusline>`, `<paginator>`
- `registerStyledComponents(window)` registers all tier 3 components: `<ui-card>`, `<ui-badge>`, `<ui-message>`, `<ui-codeblock>`, `<ui-diff>`, `<ui-skeleton>`, `<ui-spinner>`, `<ui-toast>`, `<ui-confirmation>`, `<ui-prompt>`, `<ui-sidebar>`, `<ui-log>`
- `registerAll(window)` registers all three tiers
- Individual components can still be registered manually: `window.customElements.define('button', Button)` — the helpers are a convenience, not a requirement
- Helpers are idempotent — calling them multiple times is safe
- Exported from `src/components/index.ts` (or a dedicated registration module)
- Unit tests verify: each helper registers the correct set of tag names, idempotency, and individual registration still works

**Dependencies**

- M11T1: UA stylesheet extension (helpers inject styles at the correct cascade tier)
- M11T3–M11T9: Component classes must exist with their new names (but helpers can be implemented with the current components and updated as renames land)

---

### M11T3: HTML table elements

**Summary**

Rename the table family from `ui-*` to standard HTML tag names. These are the simplest renames — the components have minimal behavior (column alignment in `Table`, flex-direction in `Tr`, text clipping in `Td`/`Th`).

**Expected Outcomes**

- `UiTable` → `Table` in `src/components/Table/`, tag name `table`
- `UiThead` → `Thead` in `src/components/Thead/`, tag name `thead`
- `UiTbody` → `Tbody` in `src/components/Tbody/`, tag name `tbody`
- `UiTfoot` → `Tfoot` in `src/components/Tfoot/`, tag name `tfoot`
- `UiTr` → `Tr` in `src/components/Tr/`, tag name `tr`
- `UiTh` → `Th` in `src/components/Th/`, tag name `th`
- `UiTd` → `Td` in `src/components/Td/`, tag name `td`
- Component styles updated: selectors change from `ui-table` to `table`, etc.
- Old component folders removed
- Tests updated for new tag names and class names
- `pnpm run check` passes

**Dependencies**

- None (rename only — no new infrastructure needed)

---

### M11T4: HTML form structure elements

**Summary**

Rename form structure elements from `ui-*` to standard HTML tag names and add key standard DOM properties where missing.

**Expected Outcomes**

- `UiForm` → `Form` in `src/components/Form/`, tag name `form`
  - Adds: `elements` getter (returns contained form controls), `reset()` method (dispatches `reset` event), `submit()` method (dispatches `submit` event)
- `UiFieldset` → `Fieldset` in `src/components/Fieldset/`, tag name `fieldset`
  - Adds: `disabled` property propagation to child form controls
- `UiLabel` → `Label` in `src/components/Label/`, tag name `label`
  - Adds: `htmlFor` property (alias for `for` attribute), clicking the label focuses the associated control
- Component styles updated, old folders removed, tests updated
- `pnpm run check` passes

**Dependencies**

- None (rename + enhance)

---

### M11T5: HTML button element

**Summary**

Rename `UiButton` to `Button` with tag name `button`. Add standard DOM properties. The button already has the most complete behavior (keyboard handling, press animation, disabled state, focus management).

**Expected Outcomes**

- `UiButton` → `Button` in `src/components/Button/`, tag name `button`
- Adds: `type` property (`'button'` default — not `'submit'` since there's no form submission in the browser sense), `disabled` property (boolean reflecting the attribute), `form` property (nearest ancestor `<form>` element or `null`)
- Component styles updated: `ui-button { ... }` → `button { ... }`
- Tests updated for new tag name and class name
- `pnpm run check` passes

**Dependencies**

- None (rename + enhance)

_Can run in parallel with M11T3 and M11T4._

---

### M11T6: HTML input and textarea elements

**Summary**

Rename `UiInput` and `UiTextarea` to `Input` and `Textarea` with standard tag names. These are the most complex renames — they involve the `[EDITABLE]` system and need key standard DOM properties.

**Expected Outcomes**

- `UiInput` → `Input` in `src/components/Input/`, tag name `input`
  - Adds: `value` property (reflects the value attribute, also gettable/settable programmatically without attribute sync — matching browser behavior where `.value` and `getAttribute('value')` can differ), `type` property (defaults to `'text'`), `placeholder` property, `disabled` / `readOnly` boolean properties, `select()` method (selects all text), `form` property
- `UiTextarea` → `Textarea` in `src/components/Textarea/`, tag name `textarea`
  - Adds: `value` property (same behavior as input), `rows` / `cols` properties (reflecting attributes), `disabled` / `readOnly` boolean properties, `select()` method, `form` property
- Component styles updated, old folders removed, tests updated
- `pnpm run check` passes

**Dependencies**

- None (rename + enhance)

_Can run in parallel with M11T3–M11T5._

---

### M11T7: HTML select, option, optgroup, meter, progress, details elements

**Summary**

Rename the remaining HTML-equivalent elements. `Select` is complex (has the dropdown/listbox behavior); the others are simpler.

**Expected Outcomes**

- `UiSelect` → `Select` in `src/components/Select/`, tag name `select`
  - Adds: `selectedIndex` property, `value` property (returns selected option's value), `options` getter (returns child `<option>` elements), `disabled` property, `form` property
- `UiOption` → `Option` in `src/components/Option/`, tag name `option`
  - Adds: `selected` boolean property, `value` property, `label` property, `disabled` property
- `UiOptgroup` → `Optgroup` in `src/components/Optgroup/`, tag name `optgroup`
  - Adds: `disabled` property, `label` property
- `UiMeter` → `Meter` in `src/components/Meter/`, tag name `meter`
  - Adds: `value`, `min`, `max`, `low`, `high`, `optimum` numeric properties
- `UiProgress` → `Progress` in `src/components/Progress/`, tag name `progress`
  - Adds: `value`, `max` numeric properties (may already exist as attributes)
- `UiDetails` → `Details` in `src/components/Details/`, tag name `details`
  - Note: `HTMLDetailsElement` already exists in `src/dom/classes/` — reconcile by having the component extend or replace it, and remove the shell class
  - Adds: `open` boolean property (may already exist)
- Component styles updated, old folders removed, tests updated
- `pnpm run check` passes

**Dependencies**

- None (rename + enhance)

_Can run in parallel with M11T3–M11T6._

---

### M11T8: HTML img element with terminal graphics support

**Summary**

Implement `<img>` as a new tier 1 HTML element. Unlike the other tier 1 tasks which rename existing components, this is a new implementation. The `<img>` element participates in layout like any other box (it has width, height, acts as a flex item). At paint time, the renderer emits terminal graphics protocol sequences to display the image within the element's cell region. Capability detection determines the best available protocol, with a text fallback for terminals without graphics support.

**Expected Outcomes**

- `Img` class exists in `src/components/Img/`, tag name `img`
- Standard DOM properties: `src` (file path), `alt` (fallback text), `width` (in cells), `height` (in cells), `naturalWidth`, `naturalHeight`
- Image loading via the filesystem resource resolver (same mechanism as `<link>` in M10, or direct `node:fs` read) — supports PNG, JPEG, GIF at minimum
- Image scaling: the loaded image is scaled to fit the element's cell dimensions (width × height from layout), maintaining aspect ratio by default
- Terminal graphics capability detection added to `TerminalManager`: query for Kitty graphics protocol, iTerm2 inline images, and Sixel support (in preference order)
- Graphics protocol writers:
  - **Kitty graphics protocol** — transmits image data via APC sequences, places at cell coordinates
  - **iTerm2 inline images** — transmits base64-encoded image via OSC 1337 sequences
  - **Sixel** — converts image to Sixel format, emits at cursor position
- **Fallback** when no graphics protocol is available: renders `alt` text content within the element's box, or fills with block characters (`░`) as a placeholder if no `alt` is provided
- The painter reserves the image's cell region in the cell buffer (cells marked as occupied so text/borders don't overwrite)
- The differ treats image regions correctly — re-emits the graphics protocol sequence when the image region is invalidated (resize, content change, scroll)
- UA default styles: `img { display: inline; }` (matching browser default)
- Unit tests cover: element properties, image loading, fallback behavior
- Integration tests cover: image renders via graphics protocol in a layout with surrounding elements, graceful fallback

**Technical Constraints**

- Image decoding: use a minimal image header parser to read dimensions (for `naturalWidth`/`naturalHeight`) without a heavy image processing dependency. Full pixel data is needed only for Sixel conversion — Kitty and iTerm2 can transmit the raw file bytes.
- Zero new runtime dependencies. Sixel encoding (if supported) is implemented from scratch — it's a simple RLE encoding of 6-pixel-high rows.

**Dependencies**

- M11T1: UA stylesheet (for default `img` styles)
- M4T5: Terminal capability detection (`TerminalManager` being extended)
- M1T22: Painter (image region reservation)
- M1T24: ANSI writer (graphics protocol sequences)

_Can run in parallel with M11T3–M11T7._

---

### M11T9: Rename navigation and data primitives

**Summary**

Rename the navigation and data interaction primitives — remove the `ui-` prefix, use descriptive unprefixed names.

**Expected Outcomes**

- `UiTabs` → `Tabs` in `src/components/Tabs/`, tag name `tabs`
- `UiTab` → `Tab` in `src/components/Tab/`, tag name `tab`
- `UiMenu` → `Navmenu` in `src/components/Navmenu/`, tag name `navmenu`
- `UiMenuItem` → `NavmenuItem` in `src/components/NavmenuItem/`, tag name `navmenuitem`
- `UiTree` → `Tree` in `src/components/Tree/`, tag name `tree`
- `UiTreeItem` → `TreeItem` in `src/components/TreeItem/`, tag name `treeitem`
- `UiList` → `Listbox` in `src/components/Listbox/`, tag name `listbox`
- `UiDropdown` → `Dropdown` in `src/components/Dropdown/`, tag name `dropdown`
- `UiBreadcrumbs` → `Breadcrumbs` in `src/components/Breadcrumbs/`, tag name `breadcrumbs`
- `UiBreadcrumb` → `Breadcrumb` in `src/components/Breadcrumb/`, tag name `breadcrumb`
- Component styles updated (selectors change), old folders removed, tests updated
- `pnpm run check` passes

**Dependencies**

- None (rename only)

_Can run in parallel with M11T3–M11T8._

---

### M11T10: Rename layout primitives

**Summary**

Rename the remaining layout and utility primitives — remove the `ui-` prefix.

**Expected Outcomes**

- `UiToolbar` → `Toolbar` in `src/components/Toolbar/`, tag name `toolbar`
- `UiStatusline` → `Statusline` in `src/components/Statusline/`, tag name `statusline`
- `UiPaginator` → `Paginator` in `src/components/Paginator/`, tag name `paginator`
- Component styles updated, old folders removed, tests updated
- `pnpm run check` passes

**Dependencies**

- None (rename only)

## _Can run in parallel with M11T3–M11T9._

### M11T11: Update createElement dispatch and public API

**Summary**

Update the `createElement()` dispatch table, barrel exports, and public API to reflect the new component taxonomy. Infrastructure elements stay hardcoded in the dispatch; everything else routes through the custom element registry.

**Expected Outcomes**

- `createElement()` dispatch (`src/dom/utilities/createElement.ts`) keeps only infrastructure elements: `style`, `template`, `a`, `dialog`, and structural elements (`html`, `head`, `body`)
- `<details>` is removed from the hardcoded dispatch — it now goes through the registry (since it's a tier 1 component that requires registration)
- `src/components/index.ts` barrel exports are updated: new class names, registration helpers
- The `src/index.ts` public API exports are updated
- Documentation in component docblocks is updated: "Register with `registerHTMLElements(window)`" or "Register with `window.customElements.define('button', Button)`"
- `pnpm run build` and `pnpm run type:check` pass

**Dependencies**

- M11T3–M11T10: All renames and new elements must be complete

---

### M11T12: Comprehensive test migration and verification

**Summary**

Final verification pass: ensure all tests use the new tag names, all old component folders are removed, no references to old names remain, and the full quality gate passes.

**Expected Outcomes**

- No references to old tag names (`ui-button`, `ui-table`, `ui-input`, etc.) remain in source or test files — except for tier 3 components which keep `ui-*`
- No old component folders remain (e.g., `src/components/UiButton/` is gone, `src/components/Button/` exists)
- All unit and integration tests pass with the new tag names
- `pnpm run check` passes (build, types, lint, tests)
- The full diff is reviewed for accidentally modified files, stale imports, or broken cross-references

**Dependencies**

- M11T11: Public API updates (final wiring)

---
