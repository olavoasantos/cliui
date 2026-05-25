# Troubleshooting Common Issues

Quick-reference for diagnosing @cliui/dom problems. Find your symptom, read the cause, apply the fix.

| #   | Category        | Symptom                                                                                                  | Cause                                                     | Fix                                                                           |
| --- | --------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Hooks           | [Hooks not firing after setup](#hooks-not-firing-after-setup)                                            | Hook overwritten without chaining                         | Save previous function, call it                                               |
| 2   | Hooks           | [MutationObserver stops delivering records](#mutationobserver-stops-delivering-records)                  | Hooks replaced after `observe()` without chaining         | Chain hooks or call `observe()` last                                          |
| 6   | Hooks           | [HOOKS Symbol mismatch across bundles](#hooks-symbol-mismatch-across-bundles)                            | Two copies of @cliui/dom in dependency tree               | Deduplicate to a single copy                                                  |
| 4   | Custom elements | [Custom element connectedCallback not firing](#custom-element-connectedcallback-not-firing)              | Element not registered or not connected                   | `define()` first, then connect to document                                    |
| 5   | Custom elements | [attributeChangedCallback not firing](#attributechangedcallback-not-firing)                              | Attribute not in `observedAttributes`                     | Add it to the static array                                                    |
| 14  | Custom elements | [Custom element missing ownerDocument / localName](#custom-element-missing-ownerdocument--localname)     | Direct `new MyElement()` bypasses `createElement()` setup | Always use `document.createElement('tag-name')`                               |
| 7   | Framework       | [Framework not finding document/window](#framework-not-finding-documentwindow)                           | Globals not installed before framework import             | Call `polyfillEnvironment()` first, dynamic-import the framework              |
| 13  | Framework       | [Window methods undefined after polyfill](#window-methods-undefined-after-polyfill)                      | Prototype methods not copied to `globalThis`              | Call methods on the `window` instance directly                                |
| 3   | Behavior        | [Style changes don't trigger hooks](#style-changes-dont-trigger-hooks)                                   | CSSStyleDeclaration has no associated element             | Use `element.style` instead of standalone instances                           |
| 9   | Behavior        | [querySelectorAll returns plain array, not NodeList](#queryselectorall-returns-plain-array-not-nodelist) | Deliberate — no live collections                          | Use standard array methods                                                    |
| 10  | Behavior        | [focusNext() includes tabindex="-1" elements](#focusnext-includes-tabindex-1-elements)                   | All `tabindex` elements participate                       | Remove `tabindex` to exclude; use `setActiveElement()` for programmatic focus |
| 11  | Behavior        | [alert/confirm/prompt don't block execution](#alertconfirmprompt-dont-block-execution)                   | Async by design — returns Promises                        | Use `await` or `.then()`                                                      |
| 12  | Behavior        | [innerHTML doesn't show style attribute](#innerhtml-doesnt-show-style-attribute)                         | Standalone `CSSStyleDeclaration` without an element       | Use `element.style` instead of standalone instances                           |
| 8   | API scope       | [Missing DOM API throws "not a function"](#missing-dom-api-throws-not-a-function)                        | API outside @cliui/dom's scope                            | Check Scope and Boundaries                                                    |

---

## Hooks not firing after setup

**Symptom.** You install a hook on `window[HOOKS]` and it never runs, even though DOM mutations are happening.

**Cause.** Another consumer overwrote the hook slot after you, without chaining.

**Fix.** Every hook installation must save the previous function and call it:

```ts
import {HOOKS} from '@cliui/dom';

const hooks = window[HOOKS];
const prev = hooks.setAttribute;

hooks.setAttribute = (el, name, value, ns, oldValue) => {
  prev?.(el, name, value, ns, oldValue); // chain first
  // your logic here
};
```

Also check that nothing replaces the entire hooks object — `window[HOOKS] = { ... }` detaches every previously installed hook.

## MutationObserver stops delivering records

**Symptom.** `MutationObserver` was working, then silently stopped. No error.

**Cause.** Someone installed hooks after `observer.observe()` without chaining. MutationObserver's internal hooks were overwritten.

**Fix.** Two options:

1. **Call `observe()` after all direct hook setup.** MutationObserver chains properly — if it installs last, the chain is intact.

2. **Always chain when installing hooks:**

```ts
import {HOOKS} from '@cliui/dom';

// ✘ Breaks MutationObserver
window[HOOKS].insertChild = (parent, child, index) => {
  renderChild(parent, child, index);
};

// ✔ MutationObserver keeps working
const prev = window[HOOKS].insertChild;
window[HOOKS].insertChild = (parent, child, index) => {
  prev?.(parent, child, index);
  renderChild(parent, child, index);
};
```

## Style changes don't trigger hooks

**Symptom.** Setting a style property doesn't fire the `setAttribute` hook.

**Cause.** The `CSSStyleDeclaration` has no associated element — it was created standalone, not through `element.style`. Detached elements created via `document.createElement()` do fire hooks.

**Fix.** Always access style declarations through `element.style`:

```ts
// ✘ Standalone declaration — no element, no hooks
import {CSSStyleDeclaration} from '@cliui/dom';
const style = new CSSStyleDeclaration();
style.color = 'red'; // silent — no hook fires

// ✔ Element-backed declaration — hooks fire
const el = document.createElement('div');
el.style.color = 'red'; // setAttribute hook fires
```

## Custom element connectedCallback not firing

**Symptom.** You define a custom element class with `connectedCallback`, register it, create an instance — but the callback never runs.

**Cause.** Either the element is not registered (`customElements.define()` was never called) or the element was appended to a detached subtree.

**Fix.** Verify registration, then ensure the element reaches the document:

```ts
customElements.get('my-widget'); // undefined means not registered
customElements.define('my-widget', MyWidget);

const widget = document.createElement('my-widget');
document.body.appendChild(widget);
// connectedCallback fires here
```

For elements created before registration, upgrade them:

```ts
const container = document.createElement('div');
const widget = document.createElement('my-widget');
container.appendChild(widget);

customElements.define('my-widget', MyWidget);
customElements.upgrade(container);

document.body.appendChild(container);
// connectedCallback fires for upgraded elements
```

## attributeChangedCallback not firing

**Symptom.** Your custom element's `attributeChangedCallback` never runs, even though `setAttribute()` succeeds.

**Cause.** The attribute is not listed in the static `observedAttributes` array. Only listed attributes trigger the callback.

**Fix.** Add the attribute name to `observedAttributes`:

```ts
class MyWidget extends HTMLElement {
  static observedAttributes = ['value', 'disabled', 'label'];

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // Only fires for 'value', 'disabled', and 'label'
  }
}
```

## HOOKS Symbol mismatch across bundles

**Symptom.** Hooks are installed but never fire. `Object.getOwnPropertySymbols(window)` shows two different `Symbol(hooks)` entries.

**Cause.** Two copies of `@cliui/dom` exist in the dependency tree. Each copy creates a unique Symbol.

**Fix.** Ensure a single copy:

- **Bundler deduplication.** In Vite: `resolve: { dedupe: ['@cliui/dom'] }`. In webpack: check `resolve.alias`.
- **peerDependencies.** Libraries should declare `@cliui/dom` as a `peerDependency`.
- **Verify:**

```ts
const hookSymbols = Object.getOwnPropertySymbols(window).filter((s) => s.description === 'hooks');
console.log(hookSymbols.length); // should be 1
```

If you see 2, run `npm ls @cliui/dom` or `pnpm ls @cliui/dom` to find the second copy.

## Framework not finding document/window

**Symptom.** A framework throws errors about `document` being undefined, even though you created a `Window`.

**Cause.** Globals aren't installed. Most frameworks check `globalThis.document` at import time and cache the result.

**Fix.** Call `polyfillEnvironment()` before importing the framework, using dynamic `import()`:

```ts
import {Window, polyfillEnvironment} from '@cliui/dom';

const window = new Window();
polyfillEnvironment(window);

const {render} = await import('preact');
const {html} = await import('htm/preact');

render(html`<div>Hello</div>`, document.body);
```

## Missing DOM API throws "not a function"

**Symptom.** `element.getBoundingClientRect()` or `window.getComputedStyle()` throws `TypeError: ... is not a function`.

**Cause.** The API is outside @cliui/dom's scope.

**Fix.** Check the [Scope and Boundaries](../learn/scope-and-boundaries.md) doc. Common intentionally-absent APIs:

| Missing API                  | Why                                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| `getBoundingClientRect()`    | Requires layout computation — belongs to the rendering layer              |
| `getComputedStyle()`         | Requires cascade resolution — styles are in `element.style`, not computed |
| `createRange()`              | Requires a visual text surface                                            |
| `NodeIterator`, `TreeWalker` | Use `parentNode`, `childNodes`, `firstChild`, `nextSibling` instead       |
| `IntersectionObserver`       | Requires a viewport and layout engine                                     |
| `ResizeObserver`             | Requires computed dimensions                                              |

## querySelectorAll returns plain array, not NodeList

**Symptom.** `element.querySelectorAll('div').item(0)` throws.

**Cause.** Deliberate. @cliui/dom returns `Element[]`, not `NodeList`. There are no live collections.

**Fix.** Use standard array methods:

```ts
const divs = document.querySelectorAll('div');

divs.forEach((div) => {
  /* ... */
});
divs.filter((div) => div.hasAttribute('data-active'));

const first = divs[0]; // bracket notation instead of .item()
const [first, second, ...rest] = divs; // destructuring
```

## focusNext() includes tabindex="-1" elements

**Symptom.** `document.focusNext()` cycles focus to elements with `tabindex="-1"`.

**Cause.** `focusNext()` cycles through all elements with a `tabindex` attribute, regardless of value. Pass `true` for reverse: `focusNext(true)`.

**Fix.** Remove the `tabindex` attribute from elements that should be skipped. For programmatic-only focus, use `document.setActiveElement()` directly:

```ts
const panel = document.createElement('div');
// No tabindex — focusNext() skips this element

document.setActiveElement(panel); // programmatic focus still works
```

## alert/confirm/prompt don't block execution

**Symptom.** `window.alert('Done')` returns immediately.

**Cause.** In @cliui/dom, `alert()`, `confirm()`, and `prompt()` are async — they return Promises.

**Fix.** Use `await`:

```ts
await window.alert('Operation complete.');

const proceed = await window.confirm('Delete this item?');
if (proceed) {
  deleteItem();
}

const name = await window.prompt('Enter your name:', 'Anonymous');
if (name !== null) {
  greet(name);
}
```

## innerHTML doesn't show style attribute

**Symptom.** You set properties on a `CSSStyleDeclaration`, but `outerHTML` doesn't include a `style` attribute.

**Cause.** The `CSSStyleDeclaration` was created without an owning element (standalone instance). Only `element.style` syncs to the element's `style` attribute automatically.

**Fix.** Use the element's own style object:

```ts
// ✓ Syncs to attribute and outerHTML
element.style.color = 'red';
element.outerHTML; // → '<div style="color: red"></div>'
```

## Window methods undefined after polyfill

**Symptom.** After calling `polyfillEnvironment(window)`, `globalThis.alert` or `globalThis.requestAnimationFrame` are `undefined`.

**Cause.** `polyfillEnvironment()` copies own instance properties to `globalThis`. Methods like `alert()` and `requestAnimationFrame()` live on `Window.prototype` and are not copied.

**Fix.** Call these methods on the `window` instance:

```ts
import {Window, polyfillEnvironment} from '@cliui/dom';

const window = new Window();
polyfillEnvironment(window);

// ✘ undefined — prototype method not copied
globalThis.requestAnimationFrame(callback);

// ✔ Call on the instance
window.requestAnimationFrame(callback);
window.alert('hello');
```

## Custom element missing ownerDocument / localName

**Symptom.** A custom element instance has no `ownerDocument`, no `localName`, and methods throw.

**Cause.** The element was created with `new MyElement()` directly, bypassing `createElement()` setup.

**Fix.** Always create custom elements through `document.createElement()`:

```ts
customElements.define('my-widget', MyWidget);

// ✘ Bypasses setup — broken element
const broken = new MyWidget();
broken.ownerDocument; // undefined

// ✔ Fully initialized
const widget = document.createElement('my-widget');
widget.ownerDocument; // Document
widget.localName; // 'my-widget'
```

## Still stuck?

If none of the entries above match your problem, these techniques help narrow things down:

**Inspect hooks state.** List installed hook symbols to verify chaining:

```ts
const symbols = Object.getOwnPropertySymbols(window);
console.log(symbols); // should include Symbol(hooks)
```

**Log inside hook chains.** Add a temporary hook that logs all calls to see what's firing:

```ts
import {HOOKS} from '@cliui/dom';

const hooks = window[HOOKS];
const prev = hooks.setAttribute;
hooks.setAttribute = (el, name, value, ns, oldValue) => {
  console.log('setAttribute', el.localName, name, value);
  prev?.(el, name, value, ns, oldValue);
};
```

**Check focus state.** When focus behavior is unexpected, inspect the active element:

```ts
console.log(document.activeElement?.localName); // currently focused element
```

**Compare style stores.** The `style` property and the `style` attribute are separate. When serialized HTML is missing styles:

```ts
console.log(el.style.cssText); // inline style object
console.log(el.getAttribute('style')); // attribute map (may be null)
```

## Where to go next

- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — for the full list of what @cliui/dom implements and the design rationale for each boundary
- **[The Hooks Bridge](../learn/hooks-bridge.md)** — for the chaining contract, timing guarantees, and how to debug hook chains
- **[What Is @cliui/dom?](../learn/what-is-cliui-dom.md)** — for the design philosophy behind the minimum viable DOM and the two-layer architecture
