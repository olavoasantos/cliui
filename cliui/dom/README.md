<p align="center">
  <img src="./.config/assets/cliui-dom.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/dom</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/dom?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20dom%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/dom` is a minimum viable DOM polyfill for Node.js — the thinnest DOM surface that still lets frameworks render.

React, Preact, Solid, Vue, and Svelte use a remarkably narrow slice of the browser DOM during a render cycle: `createElement`, `setAttribute`, `appendChild`, `removeChild`, `addEventListener`, `textContent`, a handful of tree-traversal properties, and not much else. `@cliui/dom` implements that slice faithfully, plus the extended application APIs real apps need (events, selectors, mutation observation, inline styles, custom elements, HTML parsing) — without simulating a browser.

Zero dependencies. No ties to any rendering layer. Frameworks that operate on DOM mutations — React, Preact, Solid, Vue, Svelte — are designed to work with it.

## How it works

The library separates DOM systems into two layers:

```
┌─────────────────────────────────────────────────────────┐
│  Framework (React, Preact, Solid, Vue, Svelte, ...)     │
│    calls createElement, setAttribute, appendChild, ...  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  @cliui/dom  ─  Layer 1: State                         │
│    DOM tree, attributes, styles, events, text           │
│                                                         │
│    window[HOOKS]  ─  the bridge                         │
│      createElement, setAttribute, insertChild,          │
│      removeChild, setText, focusChange, ...             │
└────────────────────────┬────────────────────────────────┘
                         │  synchronous callbacks
┌────────────────────────▼────────────────────────────────┐
│  Your Renderer  ─  Layer 2: Rendering                   │
│    terminal, canvas, test harness, devtools, ...        │
└─────────────────────────────────────────────────────────┘
```

1. **State** — the DOM tree stores structure, attributes, styles, text, and event listeners. This is `@cliui/dom`.
2. **Rendering** — something reads that state and produces output. This is your job.

The **hooks bridge** connects them. Every `Window` instance exposes `window[HOOKS]`: a plain object with callbacks that fire synchronously on every DOM mutation. A renderer installs hooks and receives fine-grained notifications — element creation, attribute changes, child insertion/removal, text updates, focus transitions — without polling or diffing.

```ts
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();

window[HOOKS].insertChild = (parent, child, index) => {
  console.log(`<${child.localName}> inserted into <${parent.localName}> at ${index}`);
};

const div = window.document.createElement('div');
window.document.body.appendChild(div);
// logs: <div> inserted into <body> at 0
```

Multiple consumers (a renderer, a MutationObserver, a devtools bridge) coexist on the same hooks by chaining: each saves the previous hook function, installs its own, and calls the saved one first. The DOM doesn't know what rendering means — it fires hooks and lets whoever is listening decide.

## What's included

| Category                 | APIs                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOM tree**             | `Document`, `Element`, `Text`, `Comment`, `DocumentFragment`, `Node`, `NodeList`, `NamedNodeMap`, `Attr`                                                                                                 |
| **Events**               | `EventTarget` with capture/bubble, `KeyboardEvent`, `MouseEvent`, `WheelEvent`, `FocusEvent`, `InputEvent`, `ClipboardEvent`, `CustomEvent`, `ErrorEvent`, `TransitionEvent`, `AnimationEvent`, and more |
| **Selectors**            | `querySelector`, `querySelectorAll`, `matches` — element, id, class, attribute, combinators, `:has()`, `:not()`, pseudo-classes                                                                          |
| **Mutation observation** | `MutationObserver` with microtask-batched delivery for `childList`, `attributes`, `characterData`                                                                                                        |
| **Inline styles**        | `CSSStyleDeclaration` with shorthand expansion (padding, margin, flex, transition, animation)                                                                                                            |
| **Custom elements**      | `CustomElementRegistry` — `define`, `get`, `whenDefined`, `upgrade`, lifecycle callbacks                                                                                                                 |
| **HTML parsing**         | `innerHTML` parsing/serialization, fragment and full-document parsers                                                                                                                                    |
| **Focus management**     | `document.activeElement`, `setActiveElement()`, `focusNext()`, focus/blur event dispatch                                                                                                                 |
| **Performance**          | `Performance` API — `now()`, `mark()`, `measure()`, `PerformanceObserver`                                                                                                                                |
| **Web APIs**             | `Location`, `Navigator`, `Clipboard`, `Notification`, `MediaQueryList` — standard shapes with pluggable handlers                                                                                         |
| **Environment**          | `polyfillEnvironment()` — installs `window`, `document`, `navigator` on `globalThis`                                                                                                                     |

## What's not included

`@cliui/dom` intentionally excludes the browser's outer circle: layout engines (`getBoundingClientRect`, `getComputedStyle`), network stacks (`fetch`, `XMLHttpRequest`), media decoders, viewport observation (`IntersectionObserver`, `ResizeObserver`), and Shadow DOM. These require a browser runtime or a domain-specific rendering layer — they don't belong in a generic DOM substrate.

The filter question behind every boundary: _does a framework touch this during render? Does common application code need it?_ If neither, it stays out.

See [Scope and Boundaries](./docs/learn/scope-and-boundaries.md) for the complete map of what's supported, what diverges from browser behavior, and what's deliberately absent.

## Usage

```shell
pnpm install @cliui/dom
```

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const div = document.createElement('div');
div.className = 'container';
div.setAttribute('style', 'color: #7c3aed');

const span = document.createElement('span');
span.textContent = 'Hello from Node.js!';

div.appendChild(span);
document.body.appendChild(div);

console.log(document.body.innerHTML);
// <div class="container" style="color: #7c3aed"><span>Hello from Node.js!</span></div>
```

## Documentation

### Learn

- **[What Is @cliui/dom?](./docs/learn/what-is-cliui-dom.md)** — Design philosophy and architecture
- **[The Hooks Bridge](./docs/learn/hooks-bridge.md)** — How renderers observe DOM mutations
- **[DOM Architecture](./docs/learn/dom-architecture.md)** — Class hierarchy and node types
- **[Event Propagation](./docs/learn/event-propagation.md)** — Capture, bubble, and listener options
- **[Custom Elements](./docs/learn/custom-elements.md)** — Lifecycle, upgrade, and light-DOM styles
- **[CSS Selectors](./docs/learn/css-selectors.md)** — Supported selector syntax
- **[CSSStyleDeclaration](./docs/learn/css-style-declaration.md)** — Proxy-based style access and shorthand expansion
- **[MutationObserver](./docs/learn/mutation-observer.md)** — Batched mutation delivery and hook chaining
- **[HTML Parsing](./docs/learn/html-parsing.md)** — Fragment and document parsers
- **[Web APIs](./docs/learn/web-apis.md)** — The handler pattern for Clipboard, Notification, Location, etc.
- **[Performance API](./docs/learn/performance-api.md)** — Marks, measures, and PerformanceObserver
- **[Scope and Boundaries](./docs/learn/scope-and-boundaries.md)** — What's not supported and why
- **[Glossary](./docs/learn/glossary.md)** — Key terms defined

### Tutorials

- **[Getting Started](./docs/tutorials/getting-started.md)** — Your first DOM in Node.js
- **[Building a Rendering Backend](./docs/tutorials/rendering-backend.md)** — From hooks to a working renderer
- **[Framework Integration](./docs/tutorials/framework-integration.md)** — Using @cliui/dom with Preact
- **[Custom Elements](./docs/tutorials/custom-elements.md)** — Building a reusable component

### How-to Guides

- **[Observe DOM Mutations](./docs/recipes/mutation-observer.md)** — MutationObserver setup and options
- **[Query Elements](./docs/recipes/query-selectors.md)** — querySelector, querySelectorAll, matches
- **[Work with Inline Styles](./docs/recipes/inline-styles.md)** — CSSStyleDeclaration usage patterns
- **[Register Custom Elements](./docs/recipes/custom-elements.md)** — define, get, whenDefined, upgrade
- **[Parse HTML](./docs/recipes/parse-html.md)** — innerHTML, parseHtml, parseDocument
- **[Handle Focus](./docs/recipes/focus-navigation.md)** — Focus management and keyboard navigation
- **[Use Dialogs](./docs/recipes/dialog-modals.md)** — HTMLDialogElement and modal focus trapping
- **[Install Globals](./docs/recipes/polyfill-environment.md)** — polyfillEnvironment() setup
- **[Integrate a Renderer](./docs/recipes/hooks-integration.md)** — Hook installation and chaining
- **[Serialize to HTML](./docs/recipes/serialization.md)** — outerHTML, innerHTML, serializeNode
- **[Move Nodes Between Documents](./docs/recipes/node-transfer.md)** — adoptNode and importNode
- **[Troubleshooting](./docs/recipes/troubleshooting.md)** — Common issues and fixes

## Inspirations

- **[@remote-dom/polyfill](https://github.com/Shopify/remote-dom)** — The DOM polyfill that serves as the foundation of this package. Forked and extended with `MutationObserver`, `CSSStyleDeclaration`, `classList`, and more.
- **[Happy DOM](https://github.com/nicedoc/happy-dom)** — Reference implementation for DOM APIs the original polyfill didn't cover.

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
