# Integrate a Rendering Backend via Hooks

Import the `HOOKS` symbol, install hooks with chaining, and wire up a rendering backend.

Every example starts from a Window:

```ts
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

## Import the HOOKS symbol

Always import `HOOKS` from `@cliui/dom`. Never create your own Symbol — a different Symbol means the DOM internals never read it.

```ts
// ✘ Different Symbol — hooks will never fire
const HOOKS = Symbol('hooks');

// ✔ Same Symbol the DOM uses
import {HOOKS} from '@cliui/dom';
```

## Access hooks on a Window

Each Window has its own hooks object. Access it via the imported symbol:

```ts
const hooks = window[HOOKS]; // plain object, starts empty
```

If your renderer supports multiple windows, install hooks on each one separately.

## Install a hook with proper chaining

Every hook slot holds a single function. Save the current occupant, install yours, and chain:

```ts
const hooks = window[HOOKS];

const previousInsert = hooks.insertChild;

hooks.insertChild = (parent, child, index) => {
  previousInsert?.(parent, child, index);
  backend.insertNode(parent, child, index);
};
```

You only need to install hooks you care about, but every hook you install must chain.

At this point, trigger a mutation and confirm your backend received it:

```ts
const el = document.createElement('div');
document.body.appendChild(el);
// Your backend.insertNode should have been called with (document.body, el, ...)
```

If nothing fires, check that you imported `HOOKS` from `@cliui/dom` (not a local Symbol) and that you're mutating properties on the existing hooks object.

### Avoid overwriting without chaining

```ts
// ✘ Silently kills every downstream consumer
hooks.insertChild = (parent, child, index) => {
  backend.insertNode(parent, child, index);
};

// ✔ Preserves the chain
const prev = hooks.insertChild;
hooks.insertChild = (parent, child, index) => {
  prev?.(parent, child, index);
  backend.insertNode(parent, child, index);
};
```

Never replace the hooks object itself. Consumers chain by mutating properties on the existing object — assigning `window[HOOKS] = { ... }` detaches every previously installed hook.

```ts
// ✘ Detaches the object — previously chained hooks are lost
window[HOOKS] = {insertChild: myHook};

// ✔ Mutate properties in place
window[HOOKS].insertChild = myHook;
```

## Choose which hooks to install

All hooks are optional. All fire synchronously, inside the mutation's call stack, after the DOM state has changed but before the triggering code continues.

### Node creation

| Hook            | Fires on                                                 | Arguments               |
| --------------- | -------------------------------------------------------- | ----------------------- |
| `createElement` | `document.createElement()`, `document.createElementNS()` | `(element, namespace?)` |
| `createText`    | `document.createTextNode()`                              | `(text, data)`          |

### Attribute mutations

| Hook              | Fires on                                                                   | Arguments                                |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| `setAttribute`    | `element.setAttribute()`, `element.setAttributeNS()`, inline style changes | `(element, name, value, ns?, oldValue?)` |
| `removeAttribute` | `element.removeAttribute()`, `element.removeAttributeNS()`                 | `(element, name, ns?, oldValue?)`        |

`setAttribute` is deduplicated when called through `element.setAttribute()` — setting an attribute to its current value does not fire the hook. Style changes and direct `Attr.value` writes bypass this deduplication.

### Text mutations

| Hook      | Fires on                         | Arguments                 |
| --------- | -------------------------------- | ------------------------- |
| `setText` | `textNode.data = ...` assignment | `(text, data, oldValue?)` |

### Tree mutations

| Hook          | Fires on                                                                                           | Arguments                |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| `insertChild` | `parentNode.appendChild()`, `parentNode.insertBefore()`, `parentNode.replaceChild()`               | `(parent, child, index)` |
| `removeChild` | `parentNode.removeChild()`, `parentNode.replaceChild()`, `parentNode.textContent = ...` (clearing) | `(parent, child, index)` |

`index` is the child's position in `parentNode.childNodes` — where it was inserted, or where it was before removal.

### Event listener tracking

| Hook                  | Fires on                            | Arguments                            |
| --------------------- | ----------------------------------- | ------------------------------------ |
| `addEventListener`    | `eventTarget.addEventListener()`    | `(target, type, listener, options?)` |
| `removeEventListener` | `eventTarget.removeEventListener()` | `(target, type, listener, options?)` |

Only fires for document-owned EventTargets. `window.addEventListener()` does not fire hooks.

### State transitions

| Hook          | Fires on                       | Arguments                                 |
| ------------- | ------------------------------ | ----------------------------------------- |
| `focusChange` | `document.setActiveElement()`  | `(previous, next)` — never `null`         |
| `hoverChange` | `document.setHoveredElement()` | `(previous, next)` — either may be `null` |

`focusChange` fires after `blur`/`focusout` events on the previous element, before `focus`/`focusin` on the next.

## Filter for specific properties

Not every `setAttribute` notification is relevant. Filter inside your hook:

```ts
const prev = hooks.setAttribute;
hooks.setAttribute = (el, name, value, ns, oldValue) => {
  prev?.(el, name, value, ns, oldValue);

  if (name === 'style') {
    backend.updateStyles(el, value);
  } else if (name === 'class') {
    backend.updateClasses(el, value);
  }
};
```

### Handle style changes

Style mutations fire `setAttribute(element, 'style', cssText)` with the entire serialized style string, not a delta. If your renderer needs individual property changes, diff against the previous value:

```ts
const styleCache = new WeakMap<Element, string>();
const prev = hooks.setAttribute;

hooks.setAttribute = (el, name, value, ns, oldValue) => {
  prev?.(el, name, value, ns, oldValue);

  if (name === 'style') {
    const cached = styleCache.get(el);
    if (cached !== value) {
      styleCache.set(el, value);
      backend.applyStyles(el, value);
    }
  }
};
```

`oldValue` is not provided for style changes — treat `undefined` as "unknown previous value."

## Coexist with MutationObserver

MutationObserver is built on hooks. Always chain — the order doesn't matter as long as you save and call the previous function. See [The Hooks Bridge](../learn/hooks-bridge.md#the-chaining-contract) for the full model.

> Hooks are permanent — there is no uninstall mechanism. `MutationObserver.disconnect()` stops record delivery but does not remove hooks from the chain.

## Handle the initial tree

`new Window()` constructs `<html>`, `<head>`, and `<body>` before any hooks can be installed. Walk the existing tree once after installing hooks:

```ts
const hooks = window[HOOKS];

// Install hooks first (chaining omitted for brevity)
hooks.createElement = (el) => backend.allocateElement(el);
hooks.insertChild = (parent, child, index) => backend.insertNode(parent, child, index);

// Then walk the existing tree
function walk(node: Element) {
  backend.allocateElement(node);
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 1) walk(child as Element);
    else if (child.nodeType === 3) backend.allocateText(child as Text);
  }
}

walk(document.documentElement);
```

## Prevent duplicate installation

If your integration code might run more than once — hot reloading, plugin reload — guard against duplicating the chain:

```ts
const INSTALLED = Symbol('my-renderer');

function installHooks(window: Window) {
  if ((window as any)[INSTALLED]) return;
  (window as any)[INSTALLED] = true;

  const hooks = window[HOOKS];

  const prevInsert = hooks.insertChild;
  hooks.insertChild = (parent, child, index) => {
    prevInsert?.(parent, child, index);
    backend.insertNode(parent, child, index);
  };

  // ... remaining hooks
}
```

Without this guard, each call appends another link to the chain and you overflow the stack.

## Ensure a single copy of @cliui/dom

If your bundler duplicates the package, each copy creates a different `HOOKS` Symbol. Your renderer writes hooks using Symbol A; the DOM fires using Symbol B. Nothing connects.

- Declare `@cliui/dom` as a `peerDependency` in libraries that depend on it.
- Check for duplicates: `npm ls @cliui/dom` or `pnpm why @cliui/dom`.
- If your bundler reports multiple copies, configure deduplication or resolution overrides.

## Where to go next

- **[The Hooks Bridge](../learn/hooks-bridge.md)** — for the timing guarantees, re-entrancy behavior, and why the chain model was chosen over an event bus
- **[Building a Rendering Backend](../tutorials/rendering-backend.md)** — step-by-step tutorial building a toy renderer from hooks
- **[Observe DOM Mutations with MutationObserver](./mutation-observer.md)** — when you need batched, asynchronous change tracking instead of synchronous per-mutation callbacks

## Complete: minimal renderer skeleton

A copy-and-modify starting point. Install all structural hooks, walk the initial tree, then let incremental mutations flow:

```ts
import {Window, HOOKS} from '@cliui/dom';
import type {Element, Text} from '@cliui/dom';

function attachRenderer(window: Window, backend: Backend) {
  const document = window.document;
  const hooks = window[HOOKS];

  // 1. Install hooks (chain any existing occupants)
  const prevCreate = hooks.createElement;
  hooks.createElement = (el, ns) => {
    prevCreate?.(el, ns);
    backend.allocate(el);
  };

  const prevText = hooks.createText;
  hooks.createText = (text, data) => {
    prevText?.(text, data);
    backend.allocateText(text);
  };

  const prevInsert = hooks.insertChild;
  hooks.insertChild = (parent, child, index) => {
    prevInsert?.(parent, child, index);
    backend.insert(parent, child, index);
  };

  const prevRemove = hooks.removeChild;
  hooks.removeChild = (parent, child, index) => {
    prevRemove?.(parent, child, index);
    backend.remove(parent, child, index);
  };

  const prevSetAttr = hooks.setAttribute;
  hooks.setAttribute = (el, name, value, ns, oldValue) => {
    prevSetAttr?.(el, name, value, ns, oldValue);
    backend.setAttribute(el, name, value);
  };

  const prevSetText = hooks.setText;
  hooks.setText = (text, data, oldValue) => {
    prevSetText?.(text, data, oldValue);
    backend.updateText(text, data);
  };

  // 2. Walk the initial tree (html, head, body already exist)
  function walk(node: Element) {
    backend.allocate(node);
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 1) walk(child as Element);
      else if (child.nodeType === 3) backend.allocateText(child as Text);
      backend.insert(node, child, i);
    }
  }

  walk(document.documentElement);

  // 3. From here, every DOM mutation flows through hooks automatically.
}
```
