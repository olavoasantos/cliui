# What Is @cliui/dom?

## A different question

Most DOM polyfills for Node.js start from the same question: *how much of the browser can we simulate?* They treat the browser's DOM as the gold standard and try to reproduce it — more APIs, more element types, more behavioral fidelity. The score is spec compliance.

@cliui/dom starts from the opposite direction: *how little DOM do frameworks actually need?*

React, Preact, Solid, Vue, Svelte — these frameworks operate on the DOM, but they use a remarkably thin slice of it. If you can identify that slice and implement it faithfully, you get a DOM that frameworks work on out of the box, at a fraction of the size and complexity of a full browser simulation.

That's what @cliui/dom is. A minimum viable DOM polyfill — the smallest DOM implementation that real UI frameworks can mount, render, and reconcile on without patches or shims.

## What "minimum viable DOM" means

"Minimum viable" is meaningless without defining *viable for what*. Here, viable means: **React, Preact, Solid, Vue, and Svelte can mount components, render output, reconcile updates, and manage events — using their standard APIs, with no framework-specific patches.**

The DOM surface area those frameworks actually touch during a render cycle is small:

- `createElement` / `createTextNode` — create nodes
- `setAttribute` / `removeAttribute` — set properties
- `appendChild` / `removeChild` / `insertBefore` — build and modify the tree
- `addEventListener` / `removeEventListener` — handle events
- `textContent` / `innerHTML` — read and write content
- `parentNode` / `childNodes` / `firstChild` / `nextSibling` — traverse the tree

That's the core. @cliui/dom implements all of it.

But "minimum viable" doesn't mean "bare minimum." The core tree operations get frameworks rendering, but real applications need more: `MutationObserver` for observing changes, `CSSStyleDeclaration` for inline styles (`element.style.color = 'red'`), `CustomElementRegistry` for component lifecycle, full event propagation with capture and bubble phases, HTML parsing via `innerHTML`, and CSS selectors via `querySelector` and `querySelectorAll`. @cliui/dom implements all of these.

What's *not* included is equally deliberate. No layout engine. No rendering. No network stack. No browser-specific element behaviors like form submission, image loading, or canvas drawing. Each absence is a design choice — not a gap. The [Scope and Boundaries](./scope-and-boundaries.md) doc covers exactly what's in and what's out.

The result: zero runtime dependencies, ~100 source files, and a public API exported from a single barrel.

## Two layers: state and rendering

To understand @cliui/dom's design, it helps to think of any DOM-based system as two layers:

**Layer 1 — State.** The DOM stores the tree structure, attributes, styles, text content, and event listeners. It tracks mutations and notifies observers when things change.

**Layer 2 — Rendering.** A renderer reads that state, computes layout, and produces visible output — pixels on a screen, cells in a terminal, serialized HTML in a string, assertions in a test.

@cliui/dom is Layer 1 only. It stores, tracks, and notifies. It has no opinion about what happens with the data.

Other polyfills blur this line. jsdom bundles a layout engine and a partial CSSOM implementation — it tries to answer questions like "what is this element's computed width?" Happy-dom includes partial rendering logic and computed style resolution. They couple state storage with output production.

That coupling has a cost. It means the polyfill is only useful for environments that match the renderer it ships with. A jsdom Document is useful for testing browser-like behavior; it's less useful as the foundation for a terminal UI, a remote display, or a canvas-based renderer.

@cliui/dom's separation means the same DOM instance can drive any of those. A terminal renderer reads the DOM and draws cells. A test harness reads the DOM and checks assertions. A remote display serializes the DOM and sends it over a wire. The framework running on top doesn't know or care which renderer is attached — it just talks to the DOM.

## The hooks bridge

The two-layer model needs a connection point — a way for Layer 2 to observe Layer 1 without polling or re-walking the tree.

That connection is the **hooks bridge**. Every `Window` instance exposes a `window[HOOKS]` object where rendering backends install callback functions. Every DOM mutation — creating an element, setting an attribute, inserting a child, changing text — fires the corresponding hook synchronously, as part of the mutation itself.

A rendering backend installs its hooks and immediately receives every DOM change as it happens — element creation, attribute changes, child insertion and removal, text updates, focus transitions. No microtask delay, no batching — synchronous notification at the moment of mutation.

This is the core architectural decision that makes @cliui/dom different from other polyfills. The DOM doesn't render anything. It doesn't even know what rendering *means*. It just fires hooks and lets whoever is listening decide what to do.

The hooks bridge has its own set of contracts and subtleties — chaining with previous hooks, coexistence with MutationObserver, Symbol identity across bundles. The [Hooks Bridge](./hooks-bridge.md) doc covers all of that.

## Where it came from

@cliui/dom is a fork of Shopify's [@remote-dom/polyfill](https://github.com/Shopify/remote-dom), a ~1500 LOC DOM designed for rendering UI extensions in a remote context. That polyfill was intentionally tiny — just enough DOM for Shopify's specific use case.

But it was too minimal for full framework rendering. No MutationObserver. No CSSStyleDeclaration. No custom element lifecycle callbacks. No event propagation. No HTML parsing. Frameworks could create elements and build trees, but anything beyond the basics broke.

On the other end, jsdom offered everything — a full browser simulation with a layout engine, CSSOM, and network stack. That completeness works well for testing browser behavior, but it comes with a large footprint, significant runtime overhead, and architectural assumptions about rendering. If you want a DOM as a generic substrate for *any* renderer, jsdom's opinions get in the way.

Between "too minimal for frameworks" and "too heavy and opinionated" was a gap: a DOM that's framework-compatible without being a browser simulator. @cliui/dom fills that gap. It keeps @remote-dom/polyfill's minimal core and extends it with the APIs frameworks actually need — MutationObserver, inline styles, custom elements, event propagation, selectors, HTML parsing — while staying small, dependency-free, and renderer-agnostic.

[Happy-dom](https://github.com/nicedoc/happy-dom) served as the API reference for features the original polyfill didn't cover. When implementing MutationObserver's batching behavior or element-level API details, happy-dom's implementation was the primary source of truth alongside the spec.

## What it's not

**Not a browser simulator.** There's no layout engine, no network stack, no `<canvas>`, no `getBoundingClientRect()`, no `getComputedStyle()`. If your code needs to know an element's pixel dimensions or computed style values, @cliui/dom can't answer those questions — a domain-specific renderer can.

**Not spec-complete, by design.** The browser DOM has hundreds of interfaces and thousands of properties. @cliui/dom implements the subset that frameworks and common application patterns use. The missing APIs aren't a backlog — they're a deliberate boundary. Every API added is an API to maintain, test, and keep consistent with the spec. The codebase stays small by saying no to things frameworks don't need.

**Not a test utility.** jsdom was designed for testing — simulating browser behavior so tests can run in Node.js. @cliui/dom is designed as a **production runtime** for frameworks in non-browser environments. You *can* test against it, but that's not its primary purpose. Its primary purpose is to be the DOM layer under a real, running application.

**Not tied to any renderer.** The hooks bridge is generic. Terminal rendering is one consumer — the one that motivated this library's creation — but the DOM itself has no terminal-specific code in its public API. A canvas renderer, a PDF generator, or a remote display protocol could connect to the same hooks and work just as well.

## Frameworks use less DOM than you think

A common reaction to "minimum viable DOM" is: *if it's not spec-complete, frameworks will break.*

They don't. Watch what a typical Preact render cycle actually touches: `createElement` to make a node, `setAttribute` to set its properties, `appendChild` to attach it to the tree, `createTextNode` for text content, `addEventListener` for events. That's the bulk of it. No `getComputedStyle`. No `getBoundingClientRect`. No `Range` or `TreeWalker` or `IntersectionObserver`. Frameworks create nodes, set properties, build trees, and bind events. @cliui/dom handles all of that.

The more subtle misconception is: *a DOM without a renderer is useless.*

Decoupling the DOM from rendering is the feature, not the limitation. It means you can swap renderers without rewriting your application. A terminal renderer today, a canvas renderer tomorrow — the framework code stays identical. It means frameworks don't need renderer-specific patches. And it means the DOM layer can focus on being a correct, minimal state container — and leave rendering to code that actually knows what "rendering" means in your environment.

## When to choose it

**Choose @cliui/dom when:**

- You need a lightweight DOM for running framework code in Node.js
- You're building a custom rendering backend (terminal, canvas, remote, embedded)
- You want zero runtime dependencies and a small footprint
- You need the DOM to be a substrate, not a simulator

**Don't choose it when:**

- You need full browser fidelity — layout calculations, network simulation, computed styles
- You need spec-complete DOM for compliance testing or browser behavior verification
- You need APIs like Shadow DOM, Range, TreeWalker, or IntersectionObserver

**The landscape:**

- **jsdom** — the most complete. Bundles a layout engine, CSSOM, and network stack. The right choice when you need your tests or SSR to match browser behavior closely — and you can afford the footprint.
- **happy-dom** — lighter than jsdom, covers more DOM APIs than @cliui/dom. A practical middle ground for test suites that need reasonable browser fidelity without jsdom's weight.
- **@cliui/dom** — framework-complete, renderer-agnostic, hooks-based. The right choice when you're building a rendering backend or running frameworks in a non-browser environment. Smaller than happy-dom, with a generic integration surface that the others don't offer.
- **linkedom** — the fastest and thinnest. Optimized for SSR and HTML serialization. Fewer APIs than @cliui/dom, no mutation observation hooks. The right choice when you need raw serialization speed and nothing else.

These aren't ranked — they're shaped for different problems.

## Where to go next

- **[Getting Started](../tutorials/getting-started.md)** — create your first DOM in Node.js in under 5 minutes
- **[The Hooks Bridge](./hooks-bridge.md)** — understand how rendering backends observe DOM mutations, the chaining contract, and the Symbol identity gotcha
- **[Scope and Boundaries](./scope-and-boundaries.md)** — the full list of what's supported, what's not, and why
