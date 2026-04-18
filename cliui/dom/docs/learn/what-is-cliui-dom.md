# What Is @cliui/dom?

## A different question

Most DOM polyfills for Node.js start from the same question: _how much of the browser can we simulate?_ They treat the browser's DOM as the gold standard and try to reproduce it — more APIs, more element types, more behavioral fidelity. The score is spec compliance.

@cliui/dom starts from the opposite direction: _how little DOM do frameworks actually need?_

React, Preact, Solid, Vue, Svelte — these frameworks operate on the DOM, but they use a remarkably thin slice of it. If you can identify that slice and implement it faithfully, you get a DOM that frameworks work on out of the box, at a fraction of the size and complexity of a full browser simulation.

That's what @cliui/dom is. A minimum viable DOM polyfill designed for full framework rendering, without simulating a browser.

## What "minimum viable DOM" means

"Minimum viable" is meaningless without defining _viable for what_. Here, viable means: **React, Preact, Solid, Vue, and Svelte can mount components, render output, reconcile updates, and manage events — using their standard APIs.** That compatibility is exercised through the monorepo's working framework examples ([React](../../../../examples/react), [Preact](../../../../examples/preact), [Solid](../../../../examples/solid), [Vue](../../../../examples/vue), [Svelte](../../../../examples/svelte)), where each framework renders into `@cliui/dom` via `@cliui/terminal`.

The DOM surface area those frameworks actually touch during a render cycle is small:

- `createElement` / `createTextNode` / `createDocumentFragment` — create nodes
- `setAttribute` / `removeAttribute` — set properties
- `appendChild` / `removeChild` / `insertBefore` / `cloneNode` — build and modify the tree
- `addEventListener` / `removeEventListener` — handle events
- `textContent` / `innerHTML` — read and write content
- `parentNode` / `childNodes` / `firstChild` / `nextSibling` — traverse the tree

That's the core. @cliui/dom implements all of it. Here's what it looks like:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const doc = window.document;

const el = doc.createElement('div');
el.setAttribute('class', 'container');
el.textContent = 'Hello';
doc.body.appendChild(el);

doc.body.innerHTML; // → '<div class="container">Hello</div>'
```

A new `Window()` already contains `<html>`, `<head>`, and `<body>` — you can append into `document.body` immediately. For frameworks that expect browser-like globals (`globalThis.document`, `globalThis.window`), `polyfillEnvironment(window)` installs the Window's properties onto `globalThis`.

A common reaction to "minimum viable" is skepticism: _if it's not spec-complete, frameworks will break._ They don't — in practice, frameworks create nodes, set properties, build trees, and bind events. No `getComputedStyle`. No `getBoundingClientRect`. No `Range` or `TreeWalker` or `IntersectionObserver`. The DOM surface frameworks touch during rendering is remarkably thin.

But "minimum viable" doesn't mean "bare minimum." The core tree operations get frameworks rendering, but real applications need more: `MutationObserver` for observing changes, `CSSStyleDeclaration` for inline styles (`element.style.color = 'red'`), `CustomElementRegistry` for component lifecycle, full event propagation with capture and bubble phases, HTML parsing via `innerHTML`, and CSS selectors via `querySelector` and `querySelectorAll`. @cliui/dom implements all of these.

### Beyond the core

The library also ships the browser-facing runtime pieces that non-browser environments commonly need: event subclasses for common input and UI events (`KeyboardEvent`, `MouseEvent`, `FocusEvent`, `InputEvent`, and others), a [Performance API](./performance-api.md) for instrumentation, [Web APIs](./web-apis.md) like `Clipboard` and `Notification` with handler-based integration, specialized element classes like [`HTMLDialogElement`](./scope-and-boundaries.md#dedicated-element-classes) with modal support, and [`polyfillEnvironment()`](./scope-and-boundaries.md#polyfillenvironment-is-a-partial-global-installer) for installing the DOM on `globalThis`.

What's _not_ included is equally deliberate. No layout engine. No rendering. No network stack. No browser-specific element behaviors like form submission, image loading, or canvas drawing. Each absence is a design choice — not a gap. The [Scope and Boundaries](./scope-and-boundaries.md) doc covers exactly what's in and what's out.

The result: zero runtime dependencies, just over 100 source files, and a main runtime API exported from a single entry point.

If the DOM stores all this state but doesn't render anything, what actually happens when the tree changes?

## Two layers: state and rendering

Any DOM-based system has two layers, whether or not it separates them:

**Layer 1 — State.** The DOM stores state — tree structure, attributes, styles, text content, event listeners, focus, and more. It tracks mutations and notifies observers when things change.

**Layer 2 — Rendering.** A renderer reads that state, computes layout, and produces visible output — pixels on a screen, cells in a terminal, or assertions in a test.

Most polyfills couple these layers — they bundle state storage with rendering assumptions, trying to answer questions like "what is this element's computed width?" That coupling means the polyfill is only useful for environments that match the renderer it ships with. A test-oriented DOM is useful for testing browser-like behavior; it's less useful as the foundation for a terminal UI, a remote display, or a canvas-based renderer.

@cliui/dom is Layer 1 only. It stores, tracks, and notifies. It has no opinion about what happens with the data.

That separation means the same DOM instance can drive any renderer. A terminal renderer reads the DOM and draws cells. A test harness reads the DOM and checks assertions. A remote display sends mutations over a wire. The framework running on top doesn't know or care which renderer is attached — it just talks to the DOM.

In the @cliui monorepo, `@cliui/terminal` is the rendering layer that consumes this DOM — providing a CSS engine, layout engine, and ANSI renderer, all connected through the hooks bridge. But `@cliui/dom` has no dependency on it and can be used independently with any renderer.

Decoupling the DOM from rendering is the feature, not the limitation. It means you can swap renderers without rewriting your application. It means frameworks don't need renderer-specific patches. And it means the DOM layer can focus on being a correct, minimal state container — and leave rendering to code that actually knows what "rendering" means in your environment.

## The hooks bridge

The two-layer model needs a connection point — a way for Layer 2 to observe Layer 1 without polling or re-walking the tree.

That connection is the **hooks bridge**. Every `Window` instance exposes a `window[HOOKS]` object where rendering backends install callback functions. The DOM operations renderers care about — such as element and text node creation, attribute changes, child insertion and removal, text updates, event listener registration, and focus and hover transitions — fire the corresponding hook synchronously, as part of the mutation itself. No microtask delay, no batching — synchronous notification at the moment of mutation.

```ts
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();

window[HOOKS].createElement = (element) => {
  console.log(`created <${element.localName}>`);
};

window.document.createElement('div'); // logs: created <div>
```

Note that `new Window()` constructs the initial document tree (`<html>`, `<head>`, `<body>`) during construction. Hooks installed afterward observe future mutations only. If your renderer needs to know about the existing tree, traverse it once after installation.

This is the core architectural decision that makes @cliui/dom different from other polyfills. The DOM doesn't render anything. It doesn't even know what rendering _means_. It just fires hooks and lets whoever is listening decide what to do.

The hooks bridge has its own set of contracts and subtleties — including a chaining discipline for multiple hook consumers and coexistence with MutationObserver. The [Hooks Bridge](./hooks-bridge.md) doc covers all of that.

## What it's not

**Not a browser simulator.** There's no layout engine, no network stack, no `<canvas>`, no `getBoundingClientRect()`, no `getComputedStyle()`. If your code needs to know an element's pixel dimensions or computed style values, @cliui/dom can't answer those questions — a domain-specific renderer can.

**Not spec-complete, by design.** The browser DOM has hundreds of interfaces and thousands of properties. @cliui/dom implements the subset that frameworks and common application patterns use. The missing APIs aren't a backlog — they're a deliberate boundary. Every API added is an API to maintain, test, and keep consistent with the spec. The codebase stays small by saying no to things frameworks don't need.

**Not a test utility.** jsdom was designed for testing — simulating browser behavior so tests can run in Node.js. @cliui/dom is designed as a **production runtime** for frameworks in non-browser environments. You _can_ test against it, but that's not its primary purpose. Its primary purpose is to be the DOM layer under a real, running application.

**Not tied to any renderer.** The hooks bridge is generic. Terminal rendering is one consumer — the one that motivated this library's creation, via `@cliui/terminal` — but the DOM itself has no terminal-specific code in its public API. A canvas renderer, a PDF generator, or a remote display protocol could connect to the same hooks and work just as well.

## The landscape

- **jsdom** — the browser-fidelity choice. Designed to closely match browser behavior for testing and SSR, with a large API surface. The right choice when you need your tests to match browser semantics closely — and you can afford the footprint.
- **happy-dom** — a lighter-weight browser-like DOM with a broad API surface. A practical middle ground for test suites that need reasonable browser fidelity without jsdom's weight.
- **@cliui/dom** — the renderer-substrate choice. Designed for environments where _you_ provide the rendering — the hooks bridge gives your renderer synchronous mutation notifications without polling or re-walking the tree, and the framework-complete surface means React, Preact, Solid, Vue, and Svelte work without patches. The right choice when you're building a rendering backend or running frameworks in a non-browser environment.
- **linkedom** — the SSR and HTML serialization choice. Optimized for fast HTML generation with a minimal API surface. The right choice when you need raw serialization speed and nothing else.

These aren't ranked — they're shaped for different problems.

## Where it came from

@cliui/dom is a fork of Shopify's [@remote-dom/polyfill](https://github.com/Shopify/remote-dom), a small DOM designed for rendering UI extensions in a remote context. That polyfill was intentionally tiny — just enough DOM for Shopify's specific use case.

But it was too minimal for full framework rendering. No MutationObserver. No CSSStyleDeclaration. No custom element lifecycle callbacks. No event propagation. No HTML parsing. Frameworks could create elements and build trees, but anything beyond the basics broke.

Between "too minimal for frameworks" and "too heavy and opinionated" was a gap: a DOM that's framework-compatible without being a browser simulator. @cliui/dom fills that gap. It keeps @remote-dom/polyfill's minimal core and extends it with the APIs frameworks actually need — MutationObserver, inline styles, custom elements, event propagation, selectors, HTML parsing — while staying small, dependency-free, and renderer-agnostic.

[Happy-dom](https://github.com/nicedoc/happy-dom) served as the API reference for features the original polyfill didn't cover. When implementing MutationObserver's batching behavior or element-level API details, happy-dom's implementation was the primary source of truth alongside the spec.

## The larger point

The concept of a minimum viable DOM — the thinnest API surface that lets existing frameworks operate unmodified — applies beyond this library. Any non-browser environment that hosts web frameworks faces the same question: how much browser do you actually need? The answer, consistently, is less than you think.

The two-layer separation is the architectural insight behind that answer. DOM state and rendering are different problems. Most tools couple them because browsers do. @cliui/dom keeps the seam explicit: it provides a faithful state container, and it gets out of the way. The hooks bridge is how it gets out of the way — synchronous mutation notification through a single integration surface, rather than coupling the state container to a specific renderer.

That's the design principle. The library is one embodiment of it.

## Where to go next

**Understand the architecture:**

- **[The Hooks Bridge](./hooks-bridge.md)** — how rendering backends observe DOM mutations, the chaining contract, and the Symbol identity gotcha
- **[DOM Architecture and Class Hierarchy](./dom-architecture.md)** — the class hierarchy, node types, createElement dispatch, and the inheritance model

**Go deeper on capabilities:**

- **[Event Propagation](./event-propagation.md)** — capture/bubble model, listener options, and browser divergences
- **[MutationObserver](./mutation-observer.md)** — batched observation built on top of hooks
- **[CSSStyleDeclaration](./css-style-declaration.md)** — the Proxy-based style system, property storage, and notification model
- **[CSS Selectors](./css-selectors.md)** — the selector engine, supported subset, and known limitations
- **[Custom Elements](./custom-elements.md)** — lifecycle, light-DOM styles, upgrade mechanism
- **[HTML Parsing](./html-parsing.md)** — fragment vs document parsing, entity decoding, and template caveats
- **[Web APIs](./web-apis.md)** — the handler pattern for Navigator, Clipboard, Notification, Location, and MediaQueryList
- **[Performance API](./performance-api.md)** — marks, measures, observers, and specialized entry types

**Know the boundaries:**

- **[Scope and Boundaries](./scope-and-boundaries.md)** — the full list of what's supported, what's not, and why
