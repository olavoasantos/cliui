# Scope and Boundaries — What's Not Supported

## The design heuristic

@cliui/dom is a minimum viable DOM — the smallest implementation that real UI frameworks can mount, render, and reconcile on. Every boundary in this document is a design decision, not a gap in coverage.

Think of the browser DOM's API surface as three concentric circles:

**Inner circle — the framework render cycle.** `createElement`, `setAttribute`, `appendChild`, `removeChild`, `insertBefore`, `createTextNode`, `addEventListener`, `textContent`, `innerHTML`, `parentNode`, `childNodes`, `firstChild`, `nextSibling`. This is what React, Preact, Solid, Vue, and Svelte actually call when they render. @cliui/dom implements all of it.

**Middle circle — extended application APIs.** `MutationObserver`, `CSSStyleDeclaration`, `CustomElementRegistry`, event propagation with capture and bubble phases, CSS selectors via `querySelector`/`querySelectorAll`, HTML parsing via `innerHTML`. Real applications need these beyond the bare render cycle. @cliui/dom implements them selectively — each addition justified by framework or application need, implemented against DOM specs with established libraries as reference.

**Outer circle — browser-specific capabilities.** Layout engines, computed styles, network stacks, media decoders, drawing surfaces, viewport observation. These require a browser runtime or a domain-specific rendering layer. @cliui/dom doesn't implement them.

The filter question behind every decision: _does a framework touch this during render? Does common application code need it?_ If neither, it stays out. Every API added is an API to maintain, test, and ship. The library's value is partly in what it doesn't include.

What follows is a complete inventory of where the boundaries are, organized by what you'd try to do when you hit one.

## DOM APIs

### Traversal — Range, TreeWalker, NodeIterator, Selection

Not implemented. Frameworks traverse the tree via `parentNode`, `childNodes`, `firstChild`, `nextSibling`, and `previousSibling` — all present. `Range`, `TreeWalker`, and `NodeIterator` are advanced traversal patterns browsers use for text selection, cursor positioning, and contenteditable editing. `Selection` and `createRange` depend on a visual text surface. None of these apply without a rendering layer that defines what "selected text" means.

### Observation — IntersectionObserver, ResizeObserver

Not implemented. Both require layout computation. `IntersectionObserver` answers "is this element visible in the viewport?" `ResizeObserver` answers "did this element's dimensions change?" Without a layout engine, there is nothing to observe — no viewport, no computed dimensions.

`MutationObserver` _is_ present. It observes DOM state — attribute changes, child list mutations, character data updates. That's Layer 1 (state), not Layer 2 (rendering). The distinction matters: @cliui/dom tracks what changed in the tree, not what changed on screen.

### Layout — getBoundingClientRect, getComputedStyle

Not implemented. These answer rendering questions: "how big is this element on screen?" and "what styles apply after cascade and inheritance?" The DOM stores inline styles and attributes. It doesn't compute layout, resolve the cascade, or know what a pixel is.

A domain-specific renderer that computes layout _could_ provide these — but they belong to the rendering layer, not the DOM layer. If your code calls `getBoundingClientRect()` and expects a `DOMRect` with real dimensions, @cliui/dom can't answer that question.

### Shadow DOM and slots

Not implemented. Shadow DOM is a rendering and encapsulation feature. It requires style scoping (preventing styles from leaking in or out), DOM boundary enforcement (shadow roots as encapsulation barriers), and slot distribution (projecting light DOM children into shadow DOM slots). Each of these is a subsystem.

Custom elements work without Shadow DOM. @cliui/dom provides light-DOM style injection via `ensureCustomElementStyles` as an alternative: when a custom element defines a static `styles` property, a single `<style>` element is inserted into `<head>` per tag name, idempotently. This handles the common case — delivering component styles alongside component markup.

What you lose compared to Shadow DOM: style encapsulation (styles can leak in both directions), DOM boundary (no separate tree for internal structure), and slot projection (no `<slot>` element distribution). For applications that need true encapsulation, this is a real limitation.

## HTML element behaviors

### Forms — submission, validation, FormData

`<form>`, `<input>`, `<select>`, `<textarea>`, and `<button>` all create elements with the correct tag name. They hold attributes, participate in the tree, fire events. But they have no built-in behavior. No submit event fires on form submission. No constraint validation API (`checkValidity`, `reportValidity`, `setCustomValidity`). No `FormData` construction from form elements. No `<input type="checkbox">` toggling.

The distinction: framework code that _renders_ form elements works — the elements exist in the DOM tree, hold attributes, and fire events. Application code that _relies_ on built-in form behavior — submitting a form and handling the submit event, constructing `FormData` from form children, calling `input.checkValidity()` — does not.

### Media — img, video, audio, canvas

These require network I/O (fetching resources), media decoders (parsing image/video/audio formats), or a drawing surface (canvas 2D/WebGL context). None of these capabilities exist in a DOM-only layer.

Elements with these tag names can exist in the tree, hold attributes like `src` and `alt`, and fire events. They just don't load resources, decode media, or provide drawing APIs.

### HTMLIFrameElement — a stub

`HTMLIFrameElement` exists as an empty class extending `HTMLElement`. It's there for one reason: React 19 performs an `element instanceof HTMLIFrameElement` check internally. Without the class, that check throws a `TypeError`. With it, the check returns `false` for all elements and React continues normally.

No element in @cliui/dom will ever be an instance of `HTMLIFrameElement`. There is no `contentDocument`, no `contentWindow`, no frame navigation.

## CSS features

### Inline styles — curated property set

`CSSStyleDeclaration` (the `element.style` object) works, but only for a curated subset of CSS properties. The Proxy-based implementation recognizes ~50 longhand properties and 4 shorthands (`padding`, `margin`, `gap`, `flex`). Custom properties (`--*`) are always accepted.

Properties in the set work as expected:

```ts
element.style.color = 'red'; // ✔ stored, hooks notified
element.style.display = 'flex'; // ✔ stored, hooks notified
element.style.setProperty('width', '100'); // ✔ stored, hooks notified
```

Properties outside the set are silently dropped:

```ts
element.style.transform = 'rotate(45deg)'; // ✘ not stored, no error
element.style.fontSize = '14px'; // ✘ not stored, no error
element.style.borderRadius = '4px'; // ✘ not stored, no error
```

No error is thrown. The assignment goes through to a plain object property on the Proxy target, but it doesn't enter the CSS property store and doesn't trigger a hooks notification. `getPropertyValue` will return `''` for these properties.

The supported longhands: `color`, `background-color`, `cursor`, `font-weight`, `font-style`, `text-decoration`, `text-decoration-style`, `text-decoration-color`, `text-align`, `vertical-align`, `text-overflow`, `white-space`, `overflow`, `overflow-wrap`, `word-break`, `tab-size`, `opacity`, `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`, `padding-top/right/bottom/left`, `margin-top/right/bottom/left`, `border-style`, `border-color`, `border-width`, `box-sizing`, `display`, `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `row-gap`, `column-gap`, `justify-content`, `align-items`, `align-self`, `position`, `top`, `left`, `z-index`.

Shorthand expansion works for `padding`, `margin`, `gap`, and `flex` — these expand into their longhand equivalents. `transition`, `animation`, and `container` shorthands are also expanded by the `expandShorthand` utility, but their longhand targets (e.g., `transition-duration`, `animation-name`) are not in the curated set, so the expanded values are not stored via the `element.style` Proxy. These shorthands are primarily consumed by the rendering layer through stylesheet parsing, not through inline styles.

This curated set is a known limitation that may be relaxed in a future version to accept arbitrary property names.

### At-rules — @import, @supports

The DOM stores `<style>` element text content but doesn't parse CSS rules. It delivers raw CSS text to the rendering layer via the hooks bridge. Rule parsing, cascade resolution, and at-rule evaluation are rendering-layer concerns.

`@import` and `@supports` are not supported anywhere in the stack — the DOM doesn't resolve them, and `@cliui/terminal`'s style engine doesn't either.

`@media`, `@container`, and `@keyframes` are supported — but by the rendering layer, not by the DOM. If you write `@media (max-width: 80) { .sidebar { display: none } }` inside a `<style>` element, @cliui/dom stores that string verbatim. `@cliui/terminal`'s style engine parses it, evaluates the condition, and applies the rules. The DOM's role is storage and delivery — it doesn't know what an at-rule is.

### Pseudo-elements — ::before, ::after, ::placeholder

Pseudo-elements are generated content created by the rendering engine. No DOM node exists for `::before` or `::after` — they can't be queried with `querySelector`, manipulated with `setAttribute`, or observed with `MutationObserver`. Implementing them requires a rendering engine that creates and positions synthetic content during layout.

### Pseudo-classes — :nth-child, :first-child, :last-child, and others

The selector engine supports the pseudo-classes frameworks commonly use: `:root`, `:focus`, `:active`, `:hover`, `:disabled`, `:enabled`. The functional pseudos `:has()` and `:not()` are also supported.

Positional pseudo-classes — `:nth-child`, `:nth-of-type`, `:first-child`, `:last-child`, `:only-child` — are not implemented. These require child-index tracking and an `An+B` microsyntax parser, adding complexity that frameworks rarely need during rendering. Structural pseudos `:empty` and `:checked`, and the forgiving selector lists `:where()` and `:is()`, are also absent.

## CSS selectors

### Supported

| Category       | Selectors                                                                    |
| -------------- | ---------------------------------------------------------------------------- |
| Basic          | Element (`div`), ID (`#id`), class (`.class`), universal (`*`)               |
| Attribute      | `[attr]` (presence), `[attr=value]` (exact match)                            |
| Combinators    | Descendant (` `), child (`>`), adjacent sibling (`+`), general sibling (`~`) |
| Pseudo-classes | `:root`, `:focus`, `:active`, `:hover`, `:disabled`, `:enabled`              |
| Functional     | `:has()`, `:not()`                                                           |

### Not supported

| Category            | Selectors                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| Positional          | `:nth-child`, `:nth-of-type`, `:first-child`, `:last-child`, `:only-child` |
| Structural          | `:empty`, `:checked`                                                       |
| Forgiving           | `:where()`, `:is()`                                                        |
| Attribute substring | `[attr^=value]`, `[attr$=value]`, `[attr*=value]`                          |
| Pseudo-elements     | `::before`, `::after`, `::placeholder`                                     |

Using an unsupported functional pseudo-class (e.g., `:where()`) in `querySelector` throws an error. Unsupported simple pseudo-classes (e.g., `:first-child`) silently don't match.

## Serialization

### Void elements always get closing tags

Browser HTML serializers omit closing tags for void elements — `<br>`, `<img>`, `<input>`, `<hr>`, and others render as self-closing in `outerHTML`. @cliui/dom serializes all elements with explicit closing tags: `<br></br>`, `<img></img>`.

This is functionally harmless for DOM consumers. HTML parsers accept both forms. It only matters if you're comparing `outerHTML` strings against browser output character-by-character — the strings won't match.

### Entity encoding

Text content is encoded with the standard set: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`. Attribute values encode `&` and `"`. This matches browser serialization behavior.

### HTML entity decoding

When parsing HTML (the `innerHTML` setter), common named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&nbsp;`, `&copy;`, `&reg;`, `&trade;`, `&mdash;`, `&ndash;`, and others) plus decimal (`&#123;`) and hexadecimal (`&#x7B;`) numeric references are decoded. The full HTML5 named entity list (~2,200 entries) is not included — only the commonly encountered subset. Unrecognized named entities are left as-is.

## Behavioral differences

These APIs exist in @cliui/dom but behave differently from their browser counterparts.

### alert, confirm, and prompt are async

Browser `alert()`, `confirm()`, and `prompt()` freeze the JavaScript thread and show a native modal dialog. Blocking the thread like this is impossible in Node.js without worker hacks.

In @cliui/dom, all three return a `Promise`. They're built on `HTMLDialogElement` internally — calling `window.alert('hello')` creates a modal `<dialog>`, and the Promise resolves when the dialog closes. The API shape changes from synchronous to asynchronous:

```ts
// Browser
const yes = confirm('Continue?'); // blocks, returns boolean

// @cliui/dom
const yes = await window.confirm('Continue?'); // returns Promise<boolean>
```

This isn't a bug — it's the only viable design without a blocking UI thread.

### Location updates don't navigate

`location.assign()` and `location.replace()` update the internal URL. Protocol, hostname, pathname, search, hash — all parsed correctly via the `URL` constructor. But no navigation occurs. There is no page to load, no history stack to push onto.

`location.reload()` is a no-op.

The URL _state_ works. The URL _behavior_ (navigation) doesn't. Environment layers that need to react to URL changes can hook into `Location` via its callback interface.

### Notification.permission is always 'granted'

`Notification.requestPermission()` resolves to `'granted'` immediately. `Notification.permission` is `'granted'` from the start. Creating a `new Notification(title, options)` triggers `Notification.handler` — a static callback the environment layer sets to wire the actual delivery mechanism (terminal escape sequences, OS notifications, or anything else).

Terminal applications don't prompt for notification permission. The environment decides how (and whether) to deliver them.

## Extending the DOM

When you need an API that @cliui/dom doesn't provide, you can add it yourself. All DOM classes are plain ES classes — no frozen prototypes, no construction guards, no framework magic preventing extension.

**Monkey-patching a missing method:**

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

**Extending a class:**

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

**Need layout calculations or computed styles?** jsdom bundles a layout engine and partial CSSOM. happy-dom offers lighter-weight computed style resolution. Both answer "how big is this element?" — @cliui/dom can't.

**Need spec-complete DOM for compliance testing?** jsdom is the standard. Its goal is browser fidelity. @cliui/dom's goal is framework compatibility at minimum size.

**Need raw HTML serialization speed?** linkedom is optimized for SSR — fast serialization, minimal API surface. If you're generating HTML strings and nothing else, it's the fastest option.

**Need a framework-compatible DOM as a substrate for custom rendering?** That's @cliui/dom. The hooks bridge, small footprint, zero dependencies, and renderer-agnostic design exist for this use case. The boundaries documented here are the cost of that focus.

These aren't rankings. They're different tools shaped for different problems.

## Where to go next

- **[What Is @cliui/dom?](./what-is-cliui-dom.md)** — the design philosophy behind minimum viable DOM, and where this library fits in the landscape
- **[The Hooks Bridge](./hooks-bridge.md)** — how rendering backends observe DOM mutations, the chaining contract, and the Symbol identity gotcha
- **[Supported CSS Selectors](./css-selectors.md)** — detailed selector engine documentation
- **[Custom Elements](./custom-elements.md)** — lifecycle, light-DOM styles, upgrade mechanism, and the Shadow DOM alternative
