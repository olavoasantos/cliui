# Install Globals with polyfillEnvironment()

Install a `Window` instance's properties onto `globalThis` so that frameworks referencing `document`, `window`, and other browser globals pick up the terminal DOM automatically.

## Create a Window and install globals

```ts
import {Window, polyfillEnvironment} from '@cliui/dom';

const window = new Window();
polyfillEnvironment(window);

// Verify globals are installed:
globalThis.document === window.document; // true
globalThis.window === globalThis; // true
```

> **Checkpoint.** If `globalThis.document === window.document` is `true`, the polyfill is active and frameworks will find the DOM.

After this call, the Window's **own instance properties** are available as globals:

- Object instances — `document`, `navigator`, `location`, `customElements`, `performance`
- DOM class constructors — `Event`, `Node`, `Element`, `HTMLElement`, `Text`, `MutationObserver`, `CustomEvent`, and others
- Self-references — `window`, `self`, `parent`, `top` (set to `globalThis`, matching browser behavior)
- `EventTarget` methods — `addEventListener`, `removeEventListener`, `dispatchEvent` (bound to the Window instance)

> **Sharp edge.** `Window.prototype` methods (`alert`, `confirm`, `prompt`, `requestAnimationFrame`, `matchMedia`, etc.) are **not** installed on `globalThis`. Call them on the Window instance directly.
>
> ```ts
> typeof globalThis.alert; // 'undefined' — prototype method not installed
> typeof window.alert; // 'function' — call it on the instance
> ```

## Call polyfillEnvironment before importing frameworks

Frameworks snapshot globals on import. If you import a framework before polyfilling, it captures `undefined` references that never update. Use dynamic imports:

```ts
import {Window, polyfillEnvironment} from '@cliui/dom';

const window = new Window();
polyfillEnvironment(window);

// ✔ Framework imports after globals exist
const {render} = await import('preact');
const {html} = await import('htm/preact');

render(html`<div>Hello from the terminal</div>`, document.body);
```

## Use with a framework entry point

A bootstrap file sets up globals, then dynamically imports the application:

```ts
// bootstrap.ts
import {Window, polyfillEnvironment} from '@cliui/dom';

const window = new Window();
polyfillEnvironment(window);

await import('./app');
```

```ts
// app.ts — static imports are fine here, globals already exist
import {render} from 'preact';
import {html} from 'htm/preact';

render(html`<h1>Terminal UI</h1>`, document.body);
```

The bootstrap file is the only place that needs dynamic imports. Everything downstream uses normal static imports.

## When not to polyfill

`polyfillEnvironment` is irreversible — there is no `unpolyfillEnvironment()`. Once globals are installed, they stay for the lifetime of the process. Skip it in these situations:

**Tests running multiple Window instances.** Each test might create its own Window for isolation. Installing one onto `globalThis` means mutations in one test leak into others. Work with the Window instance directly instead.

**Isomorphic code that checks `typeof window !== 'undefined'`.** Polyfilling makes that check return `true` in Node.js. Code using this pattern to distinguish browser from server will take the browser path.

**Multiple isolated DOM environments.** If your process needs two or more independent DOM trees (separate terminal screens), only one can own `globalThis`. The others must use their Window instances directly.

**Libraries already imported before polyfilling.** If a library has already captured `undefined` for `document` or `window`, late polyfilling won't fix those stale references. The bootstrap pattern above avoids this.

## Where to go next

- **[What Is @cliui/dom?](../learn/what-is-cliui-dom.md)** — for the two-layer architecture and why globals are optional: when to use `polyfillEnvironment` vs working with the Window instance directly
- **[Using @cliui/dom with a Framework](../tutorials/framework-integration.md)** — for a step-by-step walkthrough of running Preact on @cliui/dom, including the bootstrap pattern
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — for the full list of what @cliui/dom implements and the design rationale for each boundary
