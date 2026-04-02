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

`@cliui/dom` is a standalone DOM polyfill for Node.js. It provides a complete implementation of the core DOM APIs — `Window`, `Document`, `Element`, `Node`, `Text`, `EventTarget`, `Event`, `MutationObserver`, `CSSStyleDeclaration`, `CustomElementRegistry`, and more — designed to run outside the browser.

It has **zero dependencies** and no ties to any rendering layer. Any library or framework that operates on DOM mutations (Preact, Solid, Vue, vanilla JS) works with it out of the box.

### Key features

- **Full DOM tree** — `Document`, `Element`, `Text`, `Comment`, `DocumentFragment`, `Node`, `NodeList`, `NamedNodeMap`, `Attr`
- **Events** — `EventTarget` with capture/bubble, `KeyboardEvent`, `MouseEvent`, `WheelEvent`, `FocusEvent`, `InputEvent`, `ClipboardEvent`, `CustomEvent`
- **Selectors** — `querySelector`, `querySelectorAll`, `matches` with full CSS selector support (element, id, class, attribute, combinators)
- **Mutation observation** — real `MutationObserver` with batched microtask delivery for `childList`, `attributes`, and `characterData`
- **Inline styles** — `CSSStyleDeclaration` on every element with shorthand expansion
- **Class manipulation** — `className` and `classList` (`DOMTokenList`)
- **Custom elements** — `CustomElementRegistry` with `define`, `get`, `whenDefined`, and lifecycle callbacks
- **HTML parsing** — `innerHTML` parsing and serialization
- **Environment polyfill** — optional `polyfillEnvironment()` to install `window`, `document`, `navigator` on `globalThis`

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
div.style.color = '#7c3aed';

const span = document.createElement('span');
span.textContent = 'Hello from Node.js!';

div.appendChild(span);
document.body.appendChild(div);

console.log(document.body.innerHTML);
// <div class="container" style="color: #7c3aed;"><span>Hello from Node.js!</span></div>
```

## Inspirations

- **[@remote-dom/polyfill](https://github.com/Shopify/remote-dom)** — The DOM polyfill that serves as the foundation of this package. Forked and extended with `MutationObserver`, `CSSStyleDeclaration`, `classList`, and more.
- **[Happy DOM](https://github.com/nicedoc/happy-dom)** — Reference implementation for DOM APIs the original polyfill didn't cover.

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
