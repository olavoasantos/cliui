# Custom Elements — Building a Reusable Component

In this tutorial, we will build a custom counter element from scratch — defining a class, registering it, wiring up lifecycle callbacks, adding styles, reacting to attribute changes, and understanding the upgrade mechanism. By the end, you'll have a working `<my-counter>` component with reactive attributes and injected styles.

Each code block below is a complete `main.mjs` file. Replace the previous contents each time, then run with `node main.mjs`.

If you've completed the [rendering backend tutorial](./rendering-backend.md), you've seen how external code observes the DOM. Custom elements are the opposite direction — extending the DOM itself.

## Prerequisites

- Node.js 18 or later
- `@cliui/dom` installed (see [Getting Started](./getting-started.md))
- Basic familiarity with `createElement`, `appendChild`, and the DOM tree model

## Define a custom element class

A custom element starts as a class that extends `HTMLElement`. In @cliui/dom, `HTMLElement` extends `Element` with no additions — it exists so custom element code matches the web standard, where `extends HTMLElement` is required. Your muscle memory should be portable. No decorators, no special syntax — just a class.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {}

console.log(typeof MyCounter);
```

Run it:

```
function
```

`MyCounter` is an ordinary JavaScript class. It doesn't do anything yet — it's not registered, and the DOM doesn't know about it. That comes next.

## Register with the registry

Custom elements become usable when you register them with `customElements.define()`. This associates a tag name with your class.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {}

window.customElements.define('my-counter', MyCounter);

console.log(window.customElements.get('my-counter') === MyCounter);
```

Run it:

```
true
```

The registry now maps `'my-counter'` to `MyCounter`. From this point on, `createElement('my-counter')` will produce instances of your class.

## Create instances with createElement

With the class registered, `createElement` knows to use your constructor:

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {}

window.customElements.define('my-counter', MyCounter);

const counter = document.createElement('my-counter');

console.log(counter instanceof MyCounter);
console.log(counter instanceof HTMLElement);
console.log(counter.outerHTML);
```

Run it:

```
true
true
<my-counter></my-counter>
```

The element is an instance of both `MyCounter` and `HTMLElement`. It serializes with your tag name. But it's still detached — floating in memory, not connected to the document tree.

## Add connectedCallback

`connectedCallback` fires when the element is inserted into a connected tree — a tree rooted in the document. This is where initialization belongs.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Count: 0';
    console.log('connected — parentNode:', this.parentNode?.localName);
  }
}

window.customElements.define('my-counter', MyCounter);

const counter = document.createElement('my-counter');
console.log('before append');
document.body.appendChild(counter);
console.log('body:', document.body.innerHTML);
```

Run it:

```
before append
connected — parentNode: body
body: <my-counter>Count: 0</my-counter>
```

Three things to notice. First, `connectedCallback` fires during `appendChild`, not after — the callback runs synchronously as part of the insertion. Second, `this.parentNode` is already set when the callback fires — the element is in the tree. Third, appending to a disconnected subtree does _not_ fire `connectedCallback` — only insertion into a connected tree triggers it during normal tree mutations. (Connected upgrade also triggers it, as you'll see in the [upgrade section](#late-registration-and-the-upgrade-mechanism).)

Lifecycle callback errors don't break DOM mutations — they're rethrown asynchronously so the tree insertion completes.

## Add static styles

Components need styles. Define a static `styles` property — a @cliui/dom convention, not a web standard — and the DOM injects the CSS into `<head>` when the element connects. One `<style>` block per tag name, no matter how many instances you create.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {
  static styles = `
    my-counter { display: flex; padding: 4; }
    my-counter .label { color: green; }
  `;

  connectedCallback() {
    this.innerHTML = '<span class="label">Count: 0</span>';
  }
}

window.customElements.define('my-counter', MyCounter);

const a = document.createElement('my-counter');
const b = document.createElement('my-counter');
document.body.appendChild(a);
document.body.appendChild(b);

console.log(document.head.innerHTML);
console.log(document.body.innerHTML);
```

Run it:

```
<style data-custom-element-styles="my-counter">
    my-counter { display: flex; padding: 4; }
    my-counter .label { color: green; }
  </style>
<my-counter><span class="label">Count: 0</span></my-counter><my-counter><span class="label">Count: 0</span></my-counter>
```

One `<style>` block in `<head>`, two instances in `<body>`. The `data-custom-element-styles` attribute prevents duplicate injection — the DOM checks for it before creating the style element. These are light-DOM styles with no encapsulation — the `my-counter` selector matches every `<my-counter>` in the document, and `.label` matches every element with that class anywhere. Prefix selectors with your tag name (as shown here) to avoid collisions. See [Scope and Boundaries](../learn/scope-and-boundaries.md) for the full picture.

## Handle disconnection

`disconnectedCallback` is the counterpart to `connectedCallback` — it fires when the element is removed from a connected tree. Use it for cleanup: removing event listeners, stopping timers, releasing resources.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {
  static styles = `
    my-counter { display: flex; padding: 4; }
    my-counter .label { color: green; }
  `;

  connectedCallback() {
    this.innerHTML = '<span class="label">Count: 0</span>';
    console.log('connected — isConnected:', this.isConnected);
  }

  disconnectedCallback() {
    console.log('disconnected — parentNode:', this.parentNode);
  }
}

window.customElements.define('my-counter', MyCounter);

const counter = document.createElement('my-counter');
document.body.appendChild(counter);
console.log('in tree:', document.body.innerHTML);

document.body.removeChild(counter);
console.log('removed:', document.body.innerHTML);
```

Run it:

```
connected — isConnected: true
in tree: <my-counter><span class="label">Count: 0</span></my-counter>
disconnected — parentNode: null
removed:
```

Notice that `this.parentNode` is `null` when `disconnectedCallback` fires — the element has already been unlinked from the tree. This is the mirror of `connectedCallback`, where `this.parentNode` is already set. Moving an element between parents fires `disconnectedCallback` on the element as it leaves the old parent, then `connectedCallback` as it joins the new one.

## Observe and react to attributes

`attributeChangedCallback` fires when an observed attribute changes. You must declare which attributes to watch with a static `observedAttributes` array — unlisted attributes are silently ignored.

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

class MyCounter extends HTMLElement {
  static observedAttributes = ['value'];

  static styles = 'my-counter { display: flex; }';

  connectedCallback() {
    this.count ??= 0;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.count = Number(newValue) || 0;
    this.render();
  }

  render() {
    this.textContent = `Count: ${this.count}`;
  }
}

window.customElements.define('my-counter', MyCounter);

const counter = document.createElement('my-counter');
document.body.appendChild(counter);
console.log(counter.textContent);

counter.setAttribute('value', '5');
console.log(counter.textContent);

counter.setAttribute('value', '12');
console.log(counter.textContent);

counter.removeAttribute('value');
console.log(counter.textContent);
```

Run it:

```
Count: 0
Count: 5
Count: 12
Count: 0
```

Each `setAttribute` call fires `attributeChangedCallback` synchronously with the old and new values. `removeAttribute` fires it with `newValue` set to `null` — here, `Number(null)` is `0`, so the counter resets. Note that `attributeChangedCallback` fires regardless of whether the element is connected to the document — it's purely an attribute-change notification, not a lifecycle event.

If you forget to list an attribute in `observedAttributes`, the callback simply won't fire for it. That's by design — it keeps attribute mutation cost proportional to what you're actually observing.

## Late registration and the upgrade mechanism

Every example so far has followed the same pattern: define the class, _then_ create elements. But what happens in the other order — what if the element already exists when you register the class?

```js
import {Window, HTMLElement} from '@cliui/dom';

const window = new Window();
const document = window.document;

// Create the element BEFORE defining the class
const counter = document.createElement('my-counter');
document.body.appendChild(counter);

console.log('before define:');
console.log('  instanceof HTMLElement:', counter instanceof HTMLElement);
console.log('  has render:', typeof counter.render);

// Now define the class
class MyCounter extends HTMLElement {
  initialized = true; // class field — assigned during construction

  static observedAttributes = ['value'];

  static styles = 'my-counter { display: flex; }';

  connectedCallback() {
    this.count ??= 0;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.count = Number(newValue) || 0;
    this.render();
  }

  render() {
    this.textContent = `Count: ${this.count}`;
  }
}

window.customElements.define('my-counter', MyCounter);

console.log('after define:');
console.log('  instanceof MyCounter:', counter instanceof MyCounter);
console.log('  has render:', typeof counter.render);
console.log('  initialized:', counter.initialized);
console.log('  body:', document.body.innerHTML);
```

Run it:

```
before define:
  instanceof HTMLElement: false
  has render: undefined
after define:
  instanceof MyCounter: true
  has render: function
  initialized: undefined
  body: <my-counter>Count: 0</my-counter>
```

This is the upgrade mechanism in action. When `define()` is called, the registry walks the document tree and finds our existing `<my-counter>` element. It upgrades it in place using `Object.setPrototypeOf` — the same object, same reference, same position in the tree, but now with `MyCounter`'s prototype. The `instanceof` check flips from `false` to `true`. The `render` method appears. Because the element was already connected, `connectedCallback` fires during upgrade and the counter renders.

But look at `initialized` — it's `undefined`, not `true`. The constructor never ran. Class fields like `initialized = true` are assigned during construction, and upgrade doesn't re-construct the element. This is why we used `this.count ??= 0` in `connectedCallback`: the nullish coalescing assignment initializes the field if it wasn't set by the constructor, making the code safe for both paths.

This is the central discipline of custom element authoring: **never assume the constructor ran.** Use `connectedCallback` as the true initialization point and `??=` for safe defaults. The [Custom Elements explanation](../learn/custom-elements.md) covers additional workarounds, including attribute replay on upgrade.

Two edge cases to know: attributes set before `define()` are not replayed through `attributeChangedCallback` during upgrade — if your element had `<my-counter value="5">` before registration, `connectedCallback` must read the attribute manually. And `define()` only auto-upgrades elements in the document tree; elements in disconnected subtrees require an explicit `customElements.upgrade(root)` call.

Three things trigger lifecycle callbacks: **connecting** to the tree (insertion fires `connectedCallback`), **upgrading** an already-connected element (`define()` fires `connectedCallback` after prototype swap), and **mutating observed attributes** (fires `attributeChangedCallback` regardless of connection state). Disconnection mirrors connection. Everything else — creation, attribute changes on unobserved names, tree operations on disconnected subtrees — is silent.

## What you've learned

You built a reusable custom element with lifecycle callbacks, injected styles, and reactive attributes. Along the way, you saw:

- Custom element classes extend `HTMLElement` and are registered with `customElements.define()`
- `createElement` produces instances of your class when the tag name is registered
- `connectedCallback` fires when the element joins the document tree — this is where initialization belongs
- `static styles` injects CSS into `<head>`, once per tag name
- `attributeChangedCallback` fires for attributes listed in `static observedAttributes`
- The upgrade mechanism (`Object.setPrototypeOf`) handles elements created before their class is defined — same object, new prototype, but the constructor doesn't run
- The `??=` pattern makes initialization safe for both the define-first and create-first paths

## What's next

The registry also provides `whenDefined()` for coordinating code that depends on a custom element being registered. The **[Custom Elements explanation](../learn/custom-elements.md)** covers it in detail, along with auto-upgrade scope, attribute replay, and the full lifecycle contract.

**Deep dives:**

- **[Custom Elements](../learn/custom-elements.md)** — the full explanation: upgrade internals, callback timing, style injection, and registry semantics
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — what's supported, what's not (Shadow DOM, form-associated callbacks), and why
- **[Getting Started](./getting-started.md)** — the prerequisite tutorial covering Window, Document, and tree basics
