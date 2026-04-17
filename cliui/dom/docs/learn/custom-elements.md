# Custom Elements — Lifecycle, Upgrade, and Style Injection

## The timing problem

Custom elements introduce a question the rest of the DOM doesn't have to answer: _what happens when the definition arrives after the element already exists?_

In a static document, this never comes up — the browser parses HTML, encounters `<my-counter>`, and either knows what it is or doesn't. But in a framework-driven application, elements are created programmatically, often before all component definitions have been registered. A framework calls `createElement('my-counter')`, appends it to the tree, and only later does the module that defines `MyCounter` finish loading and call `customElements.define()`.

The DOM needs to handle both orderings — define-first and create-first — and produce the same result. This is the upgrade problem, and it shapes everything about how custom elements work in @cliui/dom.

## Two paths to the same element

When you call `document.createElement('my-counter')`, one of two things happens depending on whether `my-counter` has been registered with `customElements.define()`:

**Define first, create later.** If `my-counter` is already registered, the [createElement dispatch table](./dom-architecture.md#the-createelement-dispatch) instantiates your constructor directly — `new MyCounter()`. The constructor runs. The result is a fully initialized instance of your class.

**Create first, define later.** If `my-counter` is not yet registered, `createElement` produces a plain `Element` instance. No special class, no lifecycle methods — just a generic element with the tag name `my-counter`. When `customElements.define('my-counter', MyCounter)` is called later, the existing element is **upgraded** in place.

Both paths produce a working custom element. But the upgrade path — path two — is where the surprises are.

```
  createElement('my-counter')
         │
         ├── registered? ──▶ new MyCounter()            ─┐
         │                                               │
         └── not yet ──▶ new Element()               ├─▶ live custom element
                            │                          │
                            └── define() ─▶ setPrototypeOf ─┘
                                (+ connectedCallback if connected,
                                 minus attribute replay)
```

## The upgrade mechanism

Upgrade doesn't create a new element. The plain `Element` that `createElement` produced is still the same object in memory, the same reference in the tree, the same node other code may already hold a pointer to. What changes is its **prototype chain**.

```ts
Object.setPrototypeOf(element, Constructor.prototype);
```

After this line, the element gains all the methods and properties defined on `MyCounter.prototype`. Any code that calls `element.connectedCallback()` or accesses `element.someProperty` now reaches the custom element class. The object identity hasn't changed — `===` comparisons still pass, the element's position in the tree is untouched.

Why prototype swapping instead of replacement? Because replacement would break every reference. A framework that called `createElement` and stored the result now holds a pointer to the old object. A parent node's child list contains the old object. Event listeners are bound to the old object. Replacing the element would mean finding and updating every reference — an impossible task in a language without object forwarding. Prototype swapping preserves identity while changing capability. It's the same approach browsers use, for the same reason.

But it has a consequence that trips people up:

**The constructor does not run during upgrade.**

The element was already constructed — as a plain `Element`, by `createElement`. `Object.setPrototypeOf` swaps the prototype; it doesn't re-invoke `new`. Any initialization logic in the constructor never executes for upgraded elements.

```ts
class MyCounter extends Element {
  count = 0; // ← class field, assigned during construction

  connectedCallback() {
    this.textContent = `Count: ${this.count}`;
  }
}
```

If `MyCounter` is registered before `createElement('my-counter')`, the constructor runs and `count` is `0`. If the element is created first and upgraded later, the constructor never runs and `count` is `undefined`. The `connectedCallback` renders `Count: undefined`.

The fix: move initialization into `connectedCallback`, which fires reliably regardless of which path created the element.

```ts
class MyCounter extends Element {
  connectedCallback() {
    this.count ??= 0;
    this.textContent = `Count: ${this.count}`;
  }
}
```

This is the central discipline of custom element authoring: never assume the constructor ran. Treat `connectedCallback` as the true initialization point.

### What else upgrade skips

The constructor isn't the only thing that doesn't run. In browsers, upgrading an element fires `attributeChangedCallback` for each observed attribute already present on the element — simulating the initial "attribute set" that would have happened if the class had been defined first. @cliui/dom does not replay attributes during upgrade. If your component depends on `attributeChangedCallback` for initialization, read attributes explicitly in `connectedCallback`:

```ts
connectedCallback() {
  for (const attr of (this.constructor as typeof Element).observedAttributes ?? []) {
    if (this.hasAttribute(attr)) {
      this.attributeChangedCallback?.(attr, null, this.getAttribute(attr));
    }
  }
}
```

This is the one observable difference between the define-first and create-first paths. Both produce a working custom element, but the late-upgrade path skips attribute replay. The workaround is explicit and cheap.

## Auto-upgrade and its blind spot

`define()` doesn't just register a constructor — it immediately walks the document tree and upgrades every matching element it finds.

```ts
const el = document.createElement('my-counter');
document.body.appendChild(el);

// el is a plain Element at this point

customElements.define('my-counter', MyCounter);

// el is now an instance of MyCounter — define() upgraded it
```

The walk covers the entire document tree via a depth-first traversal. But it _only_ covers the document tree. Elements in disconnected subtrees — created but not yet appended to the document — are not visited.

```ts
const container = document.createElement('div');
const el = document.createElement('my-counter');
container.appendChild(el);

// container is not in the document tree

customElements.define('my-counter', MyCounter);
// el is NOT upgraded — it's in a disconnected subtree

customElements.upgrade(container);
// Now el is upgraded — manual upgrade targets any subtree
```

Why this limitation? Walking the entire document tree is already expensive — it's a full depth-first traversal triggered synchronously by `define()`. Tracking every disconnected element ever created would require a global weak set and make `createElement` more expensive for the common case. The trade-off: auto-upgrade covers the common case (elements already in the document), and `customElements.upgrade(root)` covers the rest on demand.

## When callbacks fire

The HTML spec defines two families of lifecycle callbacks: the four original reactions (`connected`, `disconnected`, `adopted`, `attributeChanged`), plus later additions (`connectedMoveCallback` and the form-associated callbacks). @cliui/dom implements three of the originals — `connectedCallback`, `disconnectedCallback`, and `attributeChangedCallback` — and none of the newer set.

Callbacks fire synchronously from the DOM mutation. Browsers queue reactions through a microtask-level "custom element reactions stack"; @cliui/dom does not — each mutation is a direct call. Code that assumes callbacks run in a microtask may see different ordering than in a browser.

### connectedCallback

Fires when a custom element is inserted into a connected tree — a tree rooted in the document. The element is already in the DOM when the callback fires: `this.parentNode` returns the parent, `this.isConnected` is `true`.

For subtree insertion, callbacks fire in **depth-first order** — parent before children. This ordering matters: a parent's `connectedCallback` can set up context that children's callbacks depend on.

```ts
class Parent extends Element {
  connectedCallback() {
    console.log('parent');
  }
}
class Child extends Element {
  connectedCallback() {
    console.log('child');
  }
}

customElements.define('x-parent', Parent);
customElements.define('x-child', Child);

const parent = document.createElement('x-parent');
parent.appendChild(document.createElement('x-child'));
// tree assembled while disconnected — no callbacks yet
document.body.appendChild(parent);
// logs: "parent", then "child"
```

`connectedCallback` does **not** fire when an element is appended to a disconnected subtree. Only insertion into a connected parent triggers it. The distinction is between "being in a tree" and "being in _the_ tree" — the document-rooted one.

### disconnectedCallback

Fires when a custom element is removed from a connected tree. The element has already been unlinked when the callback fires: `this.parentNode` is `null`, `this.isConnected` is `false`. Like `connectedCallback`, it fires depth-first across the removed subtree.

### Element movement

Moving an element between connected parents fires both callbacks in sequence. `containerB.appendChild(el)` where `el` is already a child of `containerA`:

1. `el` is removed from `containerA` → `disconnectedCallback` fires
2. `el` is inserted into `containerB` → `connectedCallback` fires

This means a "move" is indistinguishable from a remove-then-insert at the lifecycle level. If your `connectedCallback` performs expensive setup and `disconnectedCallback` tears it down, a move pays the full cost of both. The browser spec now defines `connectedMoveCallback` (Chrome 133+) to address this; @cliui/dom does not implement it.

### attributeChangedCallback

Fires when an observed attribute changes — regardless of whether the element is connected to the document. This differs from `connectedCallback` and `disconnectedCallback`, which only fire for connected trees.

Two requirements must be met for the callback to fire:

1. The constructor must declare a static `observedAttributes` array listing the attribute names to watch.
2. The element must implement `attributeChangedCallback`.

```ts
class MyInput extends Element {
  static readonly observedAttributes = ['value', 'disabled'];

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // oldValue is null on first set
    // newValue is null on removal
  }
}
```

Attributes not listed in `observedAttributes` don't trigger the callback, even if they change. The static property must be declared on the class itself — there's no dynamic registration API. This opt-in design keeps the cost proportional to what you're observing: an element with no `observedAttributes` pays nothing for attribute mutations.

### adoptedCallback

Not implemented. `document.adoptNode()` reassigns the element's `ownerDocument` but does not fire any callback. Form-associated callbacks (`formAssociatedCallback`, `formDisabledCallback`, `formResetCallback`, `formStateRestoreCallback`) are also absent — @cliui/dom has no form behavior system.

## The registry — define, query, wait

`CustomElementRegistry` is available on every `Window` as `window.customElements`. It provides five methods, each shaped by the timing problem described above.

### define(name, constructor)

Registers a constructor for a tag name and triggers auto-upgrade on the document tree.

In browsers, calling `define()` with an already-registered name throws a `DOMException`. @cliui/dom allows it — the new constructor overwrites the previous one. This is a deliberate departure from the spec, motivated by developer experience: hot-reload workflows redefine components during development, and throwing on redefinition forces awkward workarounds (conditional registration, unique name generation) that add complexity without safety.

One consequence: elements already upgraded under the old class keep the old prototype. `customElements.get('my-counter')` returns the new class, but existing instances in the tree are still instances of the old class. Full hot-reload requires re-creating elements, not just re-registering the class.

No tag-name validation is performed. Browsers require custom element names to contain a hyphen (`my-element`, not `myelement`). @cliui/dom doesn't enforce this, but following the convention is strongly recommended — it avoids collisions with future HTML element names. Names are compared case-sensitively; register and create with matching case. (In browsers, HTML tag names are ASCII-lowercased before lookup — this library does not.)

Customized built-ins (`define(name, class, {extends: 'button'})`) are not supported — the `options` parameter is accepted for signature compatibility and ignored.

### get(name)

Returns the constructor registered for the given name, or `undefined` if none is registered.

### getName(constructor)

Returns the tag name registered for a given constructor, or `null`. This is a reverse lookup — useful for component systems that hold a class reference and need its registered tag name to generate markup. `getName` is standard in the HTML Living Standard (shipped in all major browsers since 2023); @cliui/dom matches the browser semantics.

### whenDefined(name)

Returns a `Promise` that resolves with the constructor when the named element is defined. Resolves immediately if already defined. Multiple calls for the same name return independent promises that all resolve together when `define()` is called.

```ts
const Ctor = await customElements.whenDefined('my-counter');
const counter = new Ctor() as unknown as Element;
document.body.appendChild(counter);
```

This is the coordination primitive for the timing problem. Code that needs a custom element to be ready — but can't control when the definition loads — awaits `whenDefined` instead of polling the registry.

### upgrade(root)

Walks a subtree and upgrades matching elements. Covered in [Auto-upgrade and its blind spot](#auto-upgrade-and-its-blind-spot).

## Styles without Shadow DOM

Shadow DOM is [not implemented](./scope-and-boundaries.md#shadow-dom-and-slots), by design. Shadow DOM is a rendering and encapsulation feature that requires style scoping, DOM boundaries, and slot distribution — three subsystems that have no meaning without a browser rendering engine.

But components still need styles. @cliui/dom provides **light-DOM style injection** as a pragmatic alternative: a convention for delivering component styles alongside component markup, without pretending to offer encapsulation.

Define a static `styles` property on your custom element class:

```ts
class MyCounter extends Element {
  static readonly styles = `
    my-counter { display: flex; padding: 8; }
    my-counter .label { color: green; }
  `;

  connectedCallback() {
    this.innerHTML = '<span class="label">Count: 0</span>';
  }
}
```

When the element connects, `ensureCustomElementStyles` creates a `<style>` element with the CSS text and appends it to `<head>`. This happens once per tag name — a `data-custom-element-styles` attribute on the `<style>` element prevents duplicate injection. Creating ten `<my-counter>` elements produces one `<style>` block, not ten.

The tag name for the lookup comes from a static `tagName` property on the constructor if present, falling back to `element.localName`. Most components don't need to set `tagName` explicitly — the registry already associates the class with a tag name, and `localName` reflects it.

Style injection also runs during upgrade. If an element is already in the document when `define()` is called, the upgrade process injects styles before firing `connectedCallback`.

### The encapsulation trade-off

Light-DOM style injection is a pragmatic replacement, not an equivalent:

- **No style encapsulation.** Styles leak in both directions. A global `span { color: red }` will affect your component's internal spans. Your component's styles can affect elements outside it.
- **No DOM boundary.** The component's internal structure is part of the main document tree. External `querySelector` calls can reach inside it.
- **No slot projection.** There's no `<slot>` distribution mechanism for composing light DOM children into a component's template.

For terminal UI applications — the primary use case for @cliui/dom — these trade-offs are acceptable. Terminal renderers don't share a global CSS cascade with third-party stylesheets, and the rendering layer handles style scoping at a different level. The absence of Shadow DOM isn't a gap — it's a recognition that encapsulation in a terminal environment is a different problem with a different solution.

## Base class: Element vs. HTMLElement

The `CustomElementConstructor` type signature says `new (): HTMLElement`, matching the browser spec. But in @cliui/dom, [`HTMLElement` is an empty class](./dom-architecture.md#htmlelement--the-extension-point) that extends `Element` without adding any methods or properties. Both work as base classes for custom elements — the prototype swap doesn't care about the inheritance depth.

In practice, `Element` is the more common base class in @cliui/dom. It's the class that carries the actual DOM API surface (attributes, styles, classes, innerHTML). Extending `HTMLElement` is equally valid and may be preferable for codebases that share custom element definitions between browser and terminal environments, where the browser side requires `HTMLElement` as the base class.

The reliable initialization point is `connectedCallback`. Treat the constructor as a path-dependent hint, not a guarantee — and the rest of the custom-element surface becomes predictable.

## Where to go next

- **[Scope and Boundaries](./scope-and-boundaries.md)** — the full boundary inventory, including Shadow DOM's absence and its rationale
- **[The Hooks Bridge](./hooks-bridge.md)** — how style injection and all other DOM mutations flow through the hooks system
- **[DOM Architecture](./dom-architecture.md)** — the class hierarchy that custom elements sit on top of
