# Register and Use Custom Elements

Define a class, register it with `CustomElementRegistry`, and create instances via `document.createElement()`.

## Define a custom element class

Extend `HTMLElement` (or `Element` — both work identically in @cliui/dom) and implement lifecycle callbacks as needed.

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

class StatusBadge extends window.HTMLElement {
  static readonly observedAttributes = ['status'];

  static readonly styles = `
    status-badge { display: inline-flex; padding: 2 8; }
    status-badge[status="ok"] { color: green; }
    status-badge[status="error"] { color: red; }
  `;

  connectedCallback() {
    this.textContent = this.getAttribute('status') ?? 'unknown';
  }

  disconnectedCallback() {
    // Tear down any resources.
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'status') {
      this.textContent = newValue ?? 'unknown';
    }
  }
}
```

Put initialization logic in `connectedCallback`, not the constructor. See [Custom Elements — How They Work](../learn/custom-elements.md) for why.

## Register the element

```ts
window.customElements.define('status-badge', StatusBadge);

window.customElements.get('status-badge') === StatusBadge; // → true
```

The tag name is case-sensitive. Follow the browser convention of lowercase names with at least one hyphen (`status-badge`, not `StatusBadge`).

> **⚠️ @cliui/dom divergence:** If you redefine a tag name, the new constructor silently replaces the old one and connected instances are re-upgraded in place. Browsers throw a `DOMException` on redefinition — @cliui/dom allows it to support hot-reload workflows.

## Create instances

```ts
const badge = document.createElement('status-badge');
badge.setAttribute('status', 'ok');
document.body.appendChild(badge);

badge instanceof StatusBadge; // → true
badge.textContent; // → 'ok'  (set by connectedCallback)
```

Always use `document.createElement()` — never call the constructor directly. `createElement()` initializes `ownerDocument`, `localName`, and other DOM metadata that direct construction skips.

`connectedCallback` fires when appended; `attributeChangedCallback` fires at `setAttribute()` time regardless of connectedness.

## Add static styles

Define a static `styles` property with a CSS string. When the element connects, @cliui/dom injects a `<style>` element into `<head>`:

```ts
class MyPanel extends window.HTMLElement {
  static readonly styles = `
    my-panel { display: flex; flex-direction: column; }
    my-panel .header { font-weight: bold; }
  `;

  connectedCallback() {
    this.innerHTML = '<div class="header">Panel</div>';
  }
}

window.customElements.define('my-panel', MyPanel);
```

One `<style>` element is created per tag name, no matter how many instances exist. The styles are global — scope your selectors to the tag name (`my-panel .header`, not `.header`) to avoid collisions.

## Retrieve a registered constructor

```ts
const BadgeCtor = window.customElements.get('status-badge');
// → StatusBadge class, or undefined if not registered
```

For the reverse lookup — tag name from constructor:

```ts
const name = window.customElements.getName(StatusBadge);
// → 'status-badge'
```

## Wait for a definition

```ts
const BadgeCtor = await window.customElements.whenDefined('status-badge');
```

If already registered, the promise resolves immediately with the constructor. Otherwise, it resolves when `define()` is called for that name.

## Manually upgrade a disconnected subtree

`upgrade()` is only needed for elements created **before** their definition was registered and that are not in the document tree:

```ts
// 1. Create elements BEFORE the definition exists
const container = document.createElement('div');
const badge = document.createElement('status-badge');
container.appendChild(badge);
// badge is a plain Element — no definition exists yet

// 2. Register the definition
window.customElements.define('status-badge', StatusBadge);
// define() upgrades the document tree, but container is disconnected

// 3. Manually upgrade the disconnected subtree
window.customElements.upgrade(container);
// badge is now a StatusBadge instance
// connectedCallback has NOT fired (the subtree is still disconnected)
```

## Auto-upgrade on define()

When `define()` is called, every matching element already in the document tree is upgraded immediately:

```ts
const badge = document.createElement('status-badge');
document.body.appendChild(badge);
// badge is a plain Element — no definition exists yet

window.customElements.define('status-badge', StatusBadge);
// badge is now a StatusBadge — upgraded in place
// connectedCallback fired because badge was already connected
```

## Where to go next

- **[Custom Elements — How They Work](../learn/custom-elements.md)** — for the full lifecycle model: when callbacks fire, how prototype swapping works, and why initialization belongs in `connectedCallback` instead of the constructor
- **[Custom Elements — Building a Reusable Component](../tutorials/custom-elements.md)** — step-by-step tutorial building a complete component with styles, attributes, and lifecycle management
