# Getting Started — Your First DOM in Node.js

In this tutorial, we will create a DOM tree in Node.js using `@cliui/dom` — no browser required. We'll create a `Window`, get a `Document`, build elements, set attributes and styles, add text content, and assemble a tree. By the end, you'll have a working DOM — and you might reconsider what a DOM actually is.

Each code block below is a complete `main.mjs` file. Replace the previous contents each time, then run with `node main.mjs`.

## Prerequisites

- Node.js 18 or later
- A package manager (`npm`, `pnpm`, or `yarn`)
- Basic familiarity with JavaScript or TypeScript

> The examples are written in JavaScript. If you prefer TypeScript, name the file `main.ts` and run it with `tsx`. The APIs are the same, but strict TypeScript will want null checks on `querySelector()` results and type narrowing on event targets — standard DOM typing discipline.

## Install @cliui/dom

Create a project folder and install the package:

```bash
mkdir dom-playground && cd dom-playground
npm init -y
npm install @cliui/dom
```

Create a file called `main.mjs` — this is where we'll write our code.

```bash
touch main.mjs
```

## Create a Window

Every DOM needs an owner — a `Window` is the universe in which a document lives. In a browser, the window already exists. Here, we create one ourselves.

Add the following to `main.mjs`:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

console.log(document.body.outerHTML);
```

Run it:

```bash
node main.mjs
```

You should see:

```
<body></body>
```

If you see this output, your setup is correct. Every example from here on follows the same pattern: write the code, run `node main.mjs`, check the output.

A new `Window` comes with a complete document skeleton — `<html>`, `<head>`, and `<body>` — already assembled. The `document.body` is ready for content.

This DOM exists purely in memory — there's no browser window, no pixels, no rendering. It's a data structure that stores your tree. Every framework you've used does this same thing: builds a tree of objects in memory, then hands it to something that knows how to draw. In a browser, that "something" is built in. Here, you choose it — a terminal renderer, a test harness, a canvas, or anything else.

> If you're using a framework that expects `globalThis.document` and `globalThis.window` to exist, import `polyfillEnvironment` and call it after creating your Window:
>
> ```js
> import {Window, polyfillEnvironment} from '@cliui/dom';
> polyfillEnvironment(new Window());
> ```
>
> The tutorial doesn't need it — we'll work with the Window instance directly.

## Create an element

Let's create a `<div>` and add it to the page.

Replace the contents of `main.mjs` with:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const container = document.createElement('div');
document.body.appendChild(container);

console.log(document.body.innerHTML);
```

Run it. You should see:

```
<div></div>
```

`createElement` creates an element, and `appendChild` attaches it to the tree — the same API you'd use in a browser. Notice these are two separate steps: elements start detached, floating in memory. `appendChild` is the moment they join the living tree.

## Add text content

Let's give the `<div>` some text:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const container = document.createElement('div');
container.textContent = 'Hello from Node.js';
document.body.appendChild(container);

console.log(document.body.innerHTML);
```

Output:

```
<div>Hello from Node.js</div>
```

Setting `textContent` replaces all children of the element with a single text node — it's destructive by design. If the element had child elements, they'd be gone. When you want to preserve existing children, use `appendChild(document.createTextNode(...))` instead.

## Set attributes

Attributes are how the DOM stores metadata on elements — `id`, `class`, `data-*`, and anything else you need. Let's add a few:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const container = document.createElement('div');
container.setAttribute('id', 'app');
container.setAttribute('class', 'container');
container.setAttribute('data-version', '1');
container.textContent = 'Hello from Node.js';
document.body.appendChild(container);

console.log(document.body.innerHTML);
```

Output:

```
<div id="app" class="container" data-version="1">Hello from Node.js</div>
```

You can read attributes back with `getAttribute`:

```js
console.log(container.getAttribute('id')); // → 'app'
```

Attributes are strings — always. Even if you set a number or boolean, the DOM stores a string. This is a browser behavior that @cliui/dom preserves faithfully.

## Set inline styles

Every element has a `style` property — a `CSSStyleDeclaration` that stores CSS properties in memory. You can set properties using camelCase:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const container = document.createElement('div');
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.padding = '16px';
document.body.appendChild(container);

console.log(container.style.cssText);
```

Output:

```
display: flex; flex-direction: column; padding-top: 16px; padding-right: 16px; padding-bottom: 16px; padding-left: 16px
```

Notice that `padding` was expanded into its four longhand properties — `padding-top`, `padding-right`, `padding-bottom`, `padding-left`. Shorthand properties like `padding`, `margin`, and `flex` are automatically expanded.

Now notice we're reading `style.cssText` here, not `innerHTML`. Try `console.log(container.outerHTML)` and you'll see `<div></div>` — no `style` attribute. This is the first place where @cliui/dom diverges from browser behavior, and it's deliberate.

In a browser, you'd never notice this separation because the browser hides it from you. Here, you can see it clearly: the `style` property and the element's attributes are separate stores. Styles set via `element.style` don't appear in serialized HTML. And the reverse is also true — setting a `style` attribute with `setAttribute('style', 'color: red')` doesn't populate `element.style`. They're independent.

Rendering backends read styles through the [hooks bridge](../learn/hooks-bridge.md) — synchronous callbacks that fire the moment a property changes — rather than from serialized attributes. The DOM stores the data. The renderer decides what to do with it. That separation is the whole point.

## Build a tree

A DOM is a tree — elements containing other elements. Let's build something with structure:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

// Create a header
const header = document.createElement('header');
const title = document.createElement('h1');
title.textContent = 'My App';
header.appendChild(title);

// Create a main content area
const main = document.createElement('main');
const paragraph = document.createElement('p');
paragraph.textContent = 'Welcome to my application.';
main.appendChild(paragraph);

// Create a footer
const footer = document.createElement('footer');
footer.textContent = '© 2025';

// Assemble the page
document.body.appendChild(header);
document.body.appendChild(main);
document.body.appendChild(footer);

console.log(document.body.innerHTML);
```

Output:

```
<header><h1>My App</h1></header><main><p>Welcome to my application.</p></main><footer>© 2025</footer>
```

This is the first time you've built _structure_ — elements inside elements, a tree with meaning. Every section before this was about individual nodes. From here on, you're working with the tree as a whole.

The bottom-up pattern — create elements, give them content, attach them to parents — is the same shape of operations every framework uses under the hood. React's reconciler, Vue's renderer, Svelte's compiled output all end up doing some version of this.

## Query the tree

Once a tree exists, you can search it with CSS selectors using `querySelector` and `querySelectorAll`:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const header = document.createElement('header');
const title = document.createElement('h1');
title.setAttribute('class', 'title');
title.textContent = 'My App';
header.appendChild(title);

const main = document.createElement('main');
const paragraph = document.createElement('p');
paragraph.textContent = 'Welcome to my application.';
main.appendChild(paragraph);

document.body.appendChild(header);
document.body.appendChild(main);

// Find elements
const h1 = document.querySelector('h1');
console.log(h1.textContent); // → 'My App'

const byClass = document.querySelector('.title');
console.log(byClass.textContent); // → 'My App'

const allParagraphs = document.querySelectorAll('p');
console.log(allParagraphs.length); // → 1
```

Element, ID, class, and attribute selectors all work, along with combinators (`>`, `+`, `~`) and pseudo-classes like `:not()`. The [CSS Selectors](../learn/css-selectors.md) doc covers the full list of supported selectors.

## Listen for events

DOM elements can dispatch and listen for events. Let's add a click listener:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

const button = document.createElement('button');
button.textContent = 'Click me';
document.body.appendChild(button);

button.addEventListener('click', (event) => {
  console.log(`Clicked: ${event.target.textContent}`);
});

// Simulate a click
button.dispatchEvent(new window.Event('click', {bubbles: true}));
```

Output:

```
Clicked: Click me
```

Events propagate through the tree — a `click` event with `bubbles: true` fires on the button first, then bubbles up through each ancestor (`body` → `html` → `document`). This is the standard capture-and-bubble model, covered in detail in the [Event Propagation](../learn/event-propagation.md) doc.

In a browser, events are dispatched by user interaction — clicks, keypresses, focus changes. Here, there's no screen to click. You dispatch events yourself, or let a rendering backend dispatch them when it detects terminal input. `dispatchEvent` isn't a testing utility — it's _the_ way events happen.

## Use innerHTML to set content

You can also build DOM trees from HTML strings:

```js
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

document.body.innerHTML = `
  <div id="app">
    <h1>Hello</h1>
    <p>Built from an HTML string.</p>
  </div>
`;

const app = document.querySelector('#app');
console.log(app.children.length); // → 2
console.log(app.querySelector('h1').textContent); // → 'Hello'
```

The fragment parser behind `innerHTML` handles well-nested elements, attributes, text content, and common entities in text. It's designed for controlled markup — not arbitrary browser-grade HTML with error recovery. The [HTML Parsing](../learn/html-parsing.md) doc covers the full details, including the difference between fragment parsing (`innerHTML`) and full-document parsing (`parseDocument`).

Notice we used `app.children.length` (2), not `app.childNodes.length` (which would be 5). The difference is whitespace: the formatted HTML string contains text nodes for the newlines and indentation between elements. `children` gives you only element children; `childNodes` includes text nodes.

## What you've learned

You just built a DOM. Not a browser DOM — a pure data structure that stores a tree, tracks attributes and styles, fires events, and notifies observers. The same kind of state container that sits behind every browser tab, every SSR framework, every virtual DOM implementation.

The difference is that in a browser, the state container and the renderer are fused together. Here, they're separate. You built the state container. Now you can connect any renderer you want.

The DOM was never a browser feature. It was always a data structure that browsers happened to ship with a built-in renderer. Here, you have the data structure without the renderer — and you can see it clearly for the first time.

## What's next

How does a terminal turn this tree into something you can see? Through the [hooks bridge](../learn/hooks-bridge.md) — synchronous callbacks that fire the moment the DOM changes. It's three lines of code:

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
window[HOOKS].createElement = (el) => console.log(`created <${el.localName}>`);
window.document.createElement('div'); // logs: created <div>
```

**Deep dives:**

- **[What Is @cliui/dom?](../learn/what-is-cliui-dom.md)** — the design philosophy: why a minimum viable DOM, and how it differs from jsdom and happy-dom
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — what's supported, what's not, and why
- **[Event Propagation](../learn/event-propagation.md)** — the full capture/bubble model, listener options, and edge cases
- **[Custom Elements](../learn/custom-elements.md)** — reusable components with lifecycle callbacks and scoped styles
