# Scope and Boundaries

## The design heuristic

Every boundary in this document is a design decision, not a gap in coverage.

Think of the browser DOM's API surface as three concentric circles:

**Inner circle — the framework render cycle.** `createElement`, `setAttribute`, `appendChild`, `removeChild`, `insertBefore`, `createTextNode`, `addEventListener`, `textContent`, `innerHTML`, `parentNode`, `childNodes`, `firstChild`, `nextSibling`. This is what React, Preact, Solid, Vue, and Svelte actually call when they render. @cliui/dom implements the APIs frameworks touch during rendering — with pragmatic divergences from browser behavior where full spec fidelity would add complexity without serving the use case.

**Middle circle — extended application APIs.** `MutationObserver`, `CSSStyleDeclaration`, `CustomElementRegistry`, event propagation with capture and bubble phases, CSS selectors via `querySelector`/`querySelectorAll`, HTML parsing via `innerHTML`. Real applications need these beyond the bare render cycle. @cliui/dom implements them selectively — each addition justified by framework or application need, informed by DOM specs with established libraries as reference.

**Outer circle — browser-specific capabilities.** Layout engines, computed styles, network stacks, media decoders, drawing surfaces, viewport observation. These require a browser runtime or a domain-specific rendering layer. @cliui/dom doesn't implement them.

The filter question behind every decision: _does a framework touch this during render? Does common application code need it?_ If neither, it stays out. Every API added is an API to maintain, test, and ship. The library's value is partly in what it doesn't include.

When you hit a boundary, it's not a dead end — the [Extending the DOM](#extending-the-dom) section shows how to add missing APIs yourself. All DOM classes are plain ES classes designed for extension.

The inner and middle circle APIs are implemented — with the divergences and scope limits documented below. The outer circle isn't implemented at all.

What follows maps out where the boundaries are, organized by the kind of boundary you'll encounter: APIs that aren't here, APIs that are here but behave differently, and APIs that are here but with a defined scope. The ordering reflects debugging severity: absent APIs throw errors you'll catch immediately; behavioral divergences compile and run but produce wrong results you'll catch during testing; scoped APIs work correctly within defined limits you learn once.

## What's not here

These APIs don't exist in @cliui/dom. Accessing a missing property returns `undefined`. Calling a missing method throws `TypeError: ... is not a function`.

### Layout — getBoundingClientRect, getComputedStyle

Not implemented. These answer rendering questions: "how big is this element on screen?" and "what styles apply after cascade and inheritance?" The DOM stores inline styles and attributes. It doesn't compute layout, resolve the cascade, or know what a pixel is.

A domain-specific renderer that computes layout _could_ provide these — but they belong to the rendering layer, not the DOM layer. If your code calls `getBoundingClientRect()`, it throws `TypeError` — the method doesn't exist on the prototype.

### Shadow DOM and slots

Not implemented. Shadow DOM is a rendering and encapsulation feature. It requires style scoping (preventing styles from leaking in or out), DOM boundary enforcement (shadow roots as encapsulation barriers), and slot distribution (projecting light DOM children into shadow DOM slots). Each of these is a subsystem.

Custom elements work without Shadow DOM. @cliui/dom provides light-DOM style injection via `ensureCustomElementStyles` as an alternative: when a custom element defines a static `styles` property, a single `<style>` element is inserted into `<head>` per tag name, idempotently. This handles the common case — delivering component styles alongside component markup. See [Custom Elements](./custom-elements.md) for the full lifecycle.

What you lose compared to Shadow DOM: style encapsulation (styles can leak in both directions), DOM boundary (no separate tree for internal structure), and slot projection (no `<slot>` element distribution). For applications that need true encapsulation, this is a real limitation.

### Traversal — Range, TreeWalker, NodeIterator, Selection

Not implemented. Frameworks traverse the tree via `parentNode`, `childNodes`, `firstChild`, `nextSibling`, and `previousSibling` — all present. `Range`, `TreeWalker`, and `NodeIterator` are advanced traversal patterns browsers use for text selection, cursor positioning, and contenteditable editing. `Selection` and `createRange` depend on a visual text surface. None of these apply without a rendering layer that defines what "selected text" means.

### Observation — IntersectionObserver, ResizeObserver

Not implemented. Both require layout computation. `IntersectionObserver` answers "is this element visible in the viewport?" `ResizeObserver` answers "did this element's dimensions change?" Without a layout engine, there is nothing to observe — no viewport, no computed dimensions.

`MutationObserver` _is_ present. It observes DOM state — attribute changes, child list mutations, character data updates. That's Layer 1 (state), not Layer 2 (rendering). The distinction matters: @cliui/dom tracks what changed in the tree, not what changed on screen. See [MutationObserver](./mutation-observer.md) for the behavioral contract.

### Forms — submission, validation, FormData

`<form>`, `<input>`, `<select>`, `<textarea>`, and `<button>` all create elements with the correct tag name — but as generic `Element` instances, not specialized element classes. There is no `HTMLInputElement`, `HTMLFormElement`, or `HTMLSelectElement` in this package. The elements hold attributes, participate in the tree, and fire events, but they have no built-in behavior. No submit event fires on form submission. No constraint validation API (`checkValidity`, `reportValidity`, `setCustomValidity`). No `FormData` construction from form elements. No `<input type="checkbox">` toggling.

The distinction: framework code that _renders_ form elements works — the elements exist in the DOM tree, hold attributes, and fire events. Application code that _relies_ on built-in form behavior does not.

### Media — img, video, audio, canvas

These require network I/O (fetching resources), media decoders (parsing image/video/audio formats), or a drawing surface (canvas 2D/WebGL context). None of these capabilities exist in a DOM-only layer.

Elements with these tag names can exist in the tree, hold attributes like `src` and `alt`, and fire events. They just don't load resources, decode media, or provide drawing APIs.

### HTMLIFrameElement — a stub

`HTMLIFrameElement` exists as an empty class extending `HTMLElement`, available on `window.HTMLIFrameElement`. It's there for one reason: React 19 performs an `element instanceof HTMLIFrameElement` check internally. Without the class, that check throws a `TypeError`. With it, the check returns `false` for all elements and React continues normally.

No element in @cliui/dom will ever be an instance of `HTMLIFrameElement`. There is no `contentDocument`, no `contentWindow`, no frame navigation.

## What's here but different

These APIs exist in @cliui/dom but behave differently from their browser counterparts. They're the boundaries most likely to waste debugging time — the API exists and the call succeeds, so you don't suspect the polyfill. The divergence surfaces later, in unexpected results.

### alert, confirm, and prompt are async

Browser `alert()`, `confirm()`, and `prompt()` freeze the JavaScript thread and show a native modal dialog. Blocking the thread like this is impossible in Node.js without worker hacks.

In @cliui/dom, all three return a `Promise`. They're built on `HTMLDialogElement` internally — calling `window.alert('hello')` creates a modal `<dialog>`, and the Promise resolves when the dialog closes. The API shape changes from synchronous to asynchronous:

```ts
// Browser
const yes = confirm('Continue?'); // blocks, returns boolean

// @cliui/dom
const yes = await window.confirm('Continue?'); // returns Promise<boolean>
```

This isn't a bug — it's the only viable design without a blocking UI thread. Note that `alert`, `confirm`, and `prompt` live on `Window.prototype` and are available as `window.alert()`, but are not installed on `globalThis` by `polyfillEnvironment()`.

### polyfillEnvironment() is a partial global installer

`polyfillEnvironment(window)` installs Window instance properties onto `globalThis` — `document`, `navigator`, `location`, constructors like `Event` and `Element`, and bound `EventTarget.prototype` methods (`addEventListener`, `removeEventListener`, `dispatchEvent`).

What it does **not** install: `Window.prototype` methods. After calling `polyfillEnvironment()`, these are available on the `window` instance but **not** on `globalThis`:

- `alert`, `confirm`, `prompt`
- `matchMedia`
- `requestAnimationFrame`, `cancelAnimationFrame`
- `requestIdleCallback`, `cancelIdleCallback`

Frameworks expecting `globalThis.requestAnimationFrame` after environment setup won't find it. Access them through the `window` instance instead. Note that `polyfillEnvironment()` also rewrites the Window instance's self-referencing properties (`window`, `self`, `parent`, `top`) to point to `globalThis`.

### Location updates don't navigate

`location.assign()` and `location.replace()` update the internal URL. Protocol, hostname, pathname, search, hash — all parsed correctly via the `URL` constructor. But no navigation occurs. There is no page to load, no history stack to push onto.

`location.reload()` is a no-op.

The URL _state_ works. The URL _behavior_ (navigation) doesn't. Environment layers that need to react to URL changes can hook into `Location` via its `onPathnameChange` callback. See [Web APIs](./web-apis.md) for the full handler pattern.

### Notification.permission is always 'granted'

`Notification.requestPermission()` resolves to `'granted'` immediately. `Notification.permission` is `'granted'` from the start. Creating a `new Notification(title, options)` triggers `Notification.handler` — a static callback the environment layer sets to wire the actual delivery mechanism (terminal escape sequences, OS notifications, or anything else).

Terminal applications don't prompt for notification permission. The environment decides how (and whether) to deliver them. See [Web APIs](./web-apis.md) for the handler pattern.

### matchMedia only evaluates color scheme

`window.matchMedia()` returns a `MediaQueryList` with `matches` and `change` event support. But only `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)` are actually evaluated. All other media queries — `(min-width: ...)`, `(orientation: ...)`, `(prefers-reduced-motion)` — silently return `{ matches: false }` with no error or warning.

The `MediaQueryList` does dispatch `change` events when the color scheme changes via `window.setColorScheme()`. See [Web APIs](./web-apis.md) for the full MediaQueryList surface.

### requestAnimationFrame and requestIdleCallback are timer shims

`window.requestAnimationFrame()` and `window.requestIdleCallback()` are both backed by `setTimeout(callback, 0)`. There is no vsync, no frame budget, no idle detection. They exist so framework code that schedules visual work doesn't throw.

The two shims differ in callback contract: `requestAnimationFrame` still passes a high-resolution timestamp from `performance.now()`. `requestIdleCallback` invokes the callback with no arguments — there is no browser-style `IdleDeadline` object with `timeRemaining()`. Code that depends on frame budgets or idle deadlines will need adaptation beyond the timing difference.

### HTMLStyleElement.sheet and HTMLLinkElement.sheet are string-backed, not CSSOM

In browsers, `styleElement.sheet` returns a `CSSStyleSheet` object with `cssRules`, `insertRule()`, and the full CSSOM API. In @cliui/dom, `HTMLStyleElement.sheet` returns the element's CSS text as a plain string. `HTMLLinkElement.sheet` is `string | null` — `null` by default, set to raw stylesheet text when loaded by an external loader. There is no CSSOM — the DOM stores raw CSS text and delivers it to the rendering layer via the [hooks bridge](./hooks-bridge.md). Code that accesses `styleElement.sheet.cssRules` will get `undefined`.

### Template parsing is partially browser-like

`HTMLTemplateElement` supports `template.content` (a `DocumentFragment`) and `template.innerHTML` writes into that content fragment, not the live child tree. However, parsing a `<template>` via an outer `innerHTML` setter or `parseHtml()` does not special-case template content — parsed children land on the template element itself rather than in `.content`. This affects round-tripping: templates populated via `innerHTML` serialize differently than templates populated via HTML parsing. See [HTML Parsing](./html-parsing.md) for details.

## What's here but scoped

These APIs work within a defined scope. They're present and generally correct, but they support a specific subset rather than the full browser surface. The boundaries are well-defined — knowing the edges lets you use them confidently within their scope.

### Inline styles — curated property set

`CSSStyleDeclaration` (the `element.style` object) works, but only for a curated set of CSS properties. The Proxy-based implementation recognizes 50 longhand properties, 4 shorthands, and all custom properties (`--*`). See [CSSStyleDeclaration](./css-style-declaration.md) for the full behavioral contract.

Properties in the set work as expected:

```ts
element.style.color = 'red'; // ✔ stored, hooks notified
element.style.display = 'flex'; // ✔ stored, hooks notified
element.style.setProperty('width', '100'); // ✔ stored, hooks notified
```

Properties outside the set are not rejected — but they don't enter the CSS system:

```ts
element.style.transform = 'rotate(45deg)'; // stored as JS property, not CSS
element.style.transform; // → 'rotate(45deg)' (readable via dot notation)
element.style.getPropertyValue('transform'); // → '' (not in CSS store)
// No hooks notification fires. The property is invisible to renderers.
```

The 50 supported longhands, grouped by concern:

| Category | Properties                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout   | `display`, `position`, `top`, `left`, `z-index`, `box-sizing`, `overflow`                                                                                                                                            |
| Sizing   | `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`                                                                                                                                              |
| Flexbox  | `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `justify-content`, `align-items`, `align-self`                                                                                              |
| Spacing  | `padding-top`, `padding-right`, `padding-bottom`, `padding-left`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `row-gap`, `column-gap`                                                              |
| Text     | `color`, `font-weight`, `font-style`, `text-decoration`, `text-decoration-style`, `text-decoration-color`, `text-align`, `vertical-align`, `text-overflow`, `white-space`, `overflow-wrap`, `word-break`, `tab-size` |
| Visual   | `background-color`, `opacity`, `cursor`, `border-style`, `border-color`, `border-width`                                                                                                                              |

**Shorthand expansion** works through two paths. The `padding`, `margin`, `gap`, and `flex` shorthands are recognized by the Proxy — assigning `element.style.padding = '8 16'` expands into the four longhand properties. Additional shorthands — `transition`, `animation`, and `container` — are expanded when using `setProperty()` or `cssText` directly, but are not recognized by the Proxy's property assignment path:

```ts
element.style.transition = 'color 200ms'; // ✘ falls through to plain property storage
element.style.setProperty('transition', 'color 200ms'); // ✔ expanded into longhands
```

The curated set reflects properties relevant to terminal rendering. It may be expanded in future versions.

**Important caveat:** inline style mutations notify renderers through the hooks bridge, but the declaration store is not synchronized with the element's `style` attribute — `getAttribute('style')` does not reflect `element.style` changes. See [CSSStyleDeclaration](./css-style-declaration.md) for details.

### CSS selectors — supported subset

The selector engine covers the selectors frameworks commonly use. For the full reference, see [Supported CSS Selectors](./css-selectors.md).

**What works:** element selectors, `#id`, `.class`, `[attr]`, `[attr="value"]`, all four combinators (descendant, child `>`, adjacent `+`, sibling `~`) for single-step matching, and pseudo-classes `:root`, `:focus`, `:active`, `:hover`, `:disabled`, `:enabled`. These are simplified DOM-state checks — for example, `:active` matches elements with a `pressed` attribute, and `:disabled`/`:enabled` check the `disabled` attribute on any element, not just form controls. The functional pseudo `:not()` works as expected.

**Important caveats:**

- **`:has()` is non-standard.** It tests whether the element itself matches the inner selector — not whether it contains a matching descendant. `div:has(.active)` checks if the div has class `active`, not whether it contains a child with class `active`. This differs from the W3C relational pseudo-class.
- **Multi-hop direct-combinator chains are unreliable.** Single-combinator selectors like `div > .item` work correctly. Chained direct combinators like `section > div > .item` do not — the matching algorithm re-evaluates each part against the original target element instead of carrying forward the matched ancestor.
- **Selector lists (commas) are not supported.** `querySelector('div, span')` silently produces wrong results — the comma is not parsed as a list separator. Use separate queries instead.
- **Attribute values must be quoted.** `[type="button"]` works; `[type=button]` does not.

**Not supported:** positional pseudos (`:nth-child`, `:first-child`, `:last-child`), structural pseudos (`:empty`, `:checked`), forgiving selectors (`:where()`, `:is()`), attribute substring operators (`^=`, `$=`, `*=`), and pseudo-elements (`::before`, `::after`). Unsupported functional pseudos throw an `Error`; unsupported simple pseudos silently don't match.

### At-rules — DOM stores, rendering layer evaluates

The DOM stores `<style>` element text content but doesn't parse CSS rules. It delivers raw CSS text to the rendering layer via the hooks bridge. Whether `@media`, `@container`, `@keyframes`, `@import`, or `@supports` are evaluated depends entirely on the connected renderer — the DOM treats all at-rules as opaque text.

### Pseudo-elements — ::before, ::after, ::placeholder

Pseudo-elements are generated content created by the rendering engine. No DOM node exists for `::before` or `::after` — they can't be queried with `querySelector`, manipulated with `setAttribute`, or observed with `MutationObserver`. Implementing them requires a rendering engine that creates and positions synthetic content during layout.

### Serialization

**Void elements always get closing tags.** Browser HTML serializers omit closing tags for void elements — `<br>`, `<img>`, `<input>` render as self-closing in `outerHTML`. @cliui/dom serializes all elements with explicit closing tags: `<br></br>`, `<img></img>`. This is functionally harmless for DOM consumers — HTML parsers accept both forms. It only matters if you're comparing `outerHTML` strings against browser output character-by-character.

**Entity encoding** matches browser behavior: text content encodes `&`, `<`, `>`, `"`; attribute values encode `&` and `"`.

**Entity decoding** in text nodes (the `innerHTML` setter) supports common named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&nbsp;`, `&copy;`, `&reg;`, `&trade;`, `&mdash;`, `&ndash;`, and others) plus decimal (`&#123;`) and hexadecimal (`&#x7B;`) numeric references. The full HTML5 named entity list (~2,200 entries) is not included — only the commonly encountered subset. Unrecognized named entities are left as-is. Note that entity decoding applies to text content only — attribute values are not decoded. The HTML parser also does not have a void-element table for fragment parsing, and raw text elements like `<script>` and `<style>` have limited tokenizer support. See [HTML Parsing](./html-parsing.md) for the full parsing model and additional caveats.

## Other supported surfaces

Beyond the boundaries above, @cliui/dom includes several API surfaces that work within their designed scope. Each has its own edges — documented in detail in the linked companion pages.

### classList and DOMTokenList

`element.className` and `element.classList` work. `DOMTokenList` supports `add()`, `remove()`, `toggle()`, `replace()`, `contains()`, `item()`, iteration, and `value`. Tokens are synchronized with the `class` attribute and the selector engine — `.card.active` queries match correctly. One quirk: there is no browser-style invalid-token validation. A token containing spaces (e.g. `classList.add('hello world')`) is stored as-is, but on the next read the space causes it to split into two separate tokens.

### Dedicated element classes

Most HTML tag names produce generic `Element` instances from `createElement()`. Seven tags get dedicated classes with specialized behavior:

| Tag           | Class                 | Key behavior                                                                       |
| ------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `a`           | `HTMLAnchorElement`   | Auto-adds `tabindex="0"` when `href` is set                                        |
| `dialog`      | `HTMLDialogElement`   | `show()` non-modal; `showModal()` with focus trapping + Escape handling            |
| `link`        | `HTMLLinkElement`     | Property reflectors for `rel`, `href`, `type`; `.sheet` for loaded stylesheet text |
| `script`      | `HTMLScriptElement`   | Property reflectors for `src`, `type`, `defer`, `async`                            |
| `style`       | `HTMLStyleElement`    | `.sheet` returns raw CSS text (not CSSOM)                                          |
| `template`    | `HTMLTemplateElement` | `.content` DocumentFragment; `innerHTML` writes to content                         |
| SVG namespace | `SVGElement`          | Namespace-aware; `ownerSVGElement` walks to outermost SVG ancestor                 |

See [DOM Architecture](./dom-architecture.md) for the full class hierarchy.

### Web APIs and environment shims

The package includes terminal-oriented subsets of several browser APIs. Each uses a handler or callback pattern so the environment layer can wire the actual implementation:

- **Navigator** with terminal-appropriate defaults (`navigator.clipboard`, `navigator.permissions = null`)
- **Clipboard** via static `readHandler`/`writeHandler` callbacks
- **MediaQueryList** with `matches` + `change` events (evaluated queries limited to `prefers-color-scheme`)
- **`requestAnimationFrame`/`requestIdleCallback`** as `setTimeout` shims

See [Web APIs](./web-apis.md) for the handler pattern and full API surface.

### Performance API

`performance.now()`, `mark()`, `measure()`, entry queries, and `PerformanceObserver` are implemented with microtask-batched delivery. Specialized entry types include `PerformanceEventTiming`, `PerformancePaintTiming`, and `LargestContentfulPaint`. The API is designed for external instrumentation via `recordEntry()`. See [Performance API](./performance-api.md) for supported entry types and boundaries.

### Event propagation

Full event propagation with capture and bubble phases, `stopPropagation`, `stopImmediatePropagation`, and listener options (`capture`, `once`, `signal`). The `passive` option is accepted in the type surface but has no behavioral effect — there is no default scrolling to prevent. Event subclasses include `KeyboardEvent`, `MouseEvent`, `FocusEvent`, `InputEvent`, `ClipboardEvent`, and others. See [Event Propagation](./event-propagation.md) for the model and divergences from browser behavior.

## Extending the DOM

When you hit a boundary, you can extend the DOM yourself. All classes are plain ES classes — no frozen prototypes, no construction guards, no framework magic preventing extension.

**Monkey-patching** adds methods globally — every element gains the method. Use this when a library expects the method on all elements:

```ts
import {Element} from '@cliui/dom';

// Add a zero-rect getBoundingClientRect for libraries that check for its existence
Element.prototype.getBoundingClientRect = function () {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON() {
      return this;
    },
  };
};
```

**Class extension** is scoped — only elements you construct from the subclass have the added behavior. Use this when building domain-specific element types:

```ts
import {Element} from '@cliui/dom';

class LayoutAwareElement extends Element {
  #bounds = {x: 0, y: 0, width: 0, height: 0};

  getBoundingClientRect() {
    const {x, y, width, height} = this.#bounds;
    return {
      x,
      y,
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
      toJSON() {
        return this;
      },
    };
  }

  /** Called by your layout engine after computing positions. */
  updateBounds(x: number, y: number, width: number, height: number) {
    this.#bounds = {x, y, width, height};
  }
}
```

This is the intended extension pattern. The DOM provides the tree, attributes, events, and mutation notification. Domain-specific capabilities — layout, computed styles, resource loading — live in your layer, not in the DOM.

## When to choose a different tool

These boundaries are permanent. If your application needs capabilities in the outer circle, @cliui/dom is the wrong tool — not because it's incomplete, but because it's designed for a different problem.

**Need layout calculations or computed styles?** jsdom provides partial CSSOM and layout-adjacent APIs. happy-dom offers lighter-weight computed style resolution. Both answer "how big is this element?" — @cliui/dom can't.

**Need spec-complete DOM for compliance testing?** jsdom is the standard. Its goal is browser fidelity. @cliui/dom's goal is framework compatibility at minimum size.

**Need raw HTML serialization speed?** linkedom is optimized for SSR — fast serialization, minimal API surface. If you're generating HTML strings and nothing else, linkedom is purpose-built for that.

**Need a framework-compatible DOM as a substrate for custom rendering?** That's @cliui/dom. The hooks bridge, small footprint, zero dependencies, and renderer-agnostic design exist for this use case. The boundaries documented here are the cost of that focus.

These aren't rankings. They're different tools shaped for different problems.

## Where to go next

The boundaries in this document draw a consistent line: the DOM is a state container. Everything above state — layout computation, style resolution, resource loading, rendering — belongs to the layers above it. This separation is what makes @cliui/dom useful as a substrate for any renderer, not just one.

- **[What Is @cliui/dom?](./what-is-cliui-dom.md)** — the design philosophy behind minimum viable DOM, and where this library fits in the landscape
- **[The Hooks Bridge](./hooks-bridge.md)** — how rendering backends observe DOM mutations, the chaining contract, and the Symbol identity gotcha
- **[CSSStyleDeclaration](./css-style-declaration.md)** — the Proxy-based style system, property storage, and notification model
- **[Supported CSS Selectors](./css-selectors.md)** — the full selector engine reference, including known limitations
- **[Web APIs](./web-apis.md)** — the handler pattern for Navigator, Clipboard, Notification, Location, and MediaQueryList
- **[Custom Elements](./custom-elements.md)** — lifecycle, light-DOM styles, upgrade mechanism, and the Shadow DOM alternative
- **[HTML Parsing](./html-parsing.md)** — fragment vs document parsing, entity decoding, and template caveats
- **[Event Propagation](./event-propagation.md)** — capture/bubble model, listener options, and browser divergences
- **[Performance API](./performance-api.md)** — marks, measures, observers, and specialized entry types
- **[DOM Architecture](./dom-architecture.md)** — class hierarchy, node types, and the inheritance model
