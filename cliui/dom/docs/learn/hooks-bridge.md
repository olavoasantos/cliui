# The Hooks Bridge — How Renderers Observe the DOM

## The contract between state and rendering

@cliui/dom [separates DOM-based systems into two layers](./what-is-cliui-dom.md#two-layers-state-and-rendering): the DOM stores state (tree structure, attributes, styles, text, event listeners), and a renderer reads that state to produce output. The hooks bridge is the formal integration surface between them — the mechanism Layer 2 uses to observe Layer 1.

Every `Window` instance carries a `[HOOKS]` property — a plain object with optional function properties, one per mutation type. A renderer installs callback functions on this object. From that point forward, every DOM mutation fires the corresponding hook synchronously, and the renderer receives it.

```ts
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();

window[HOOKS].createElement = (element) => {
  console.log(`created <${element.tagName.toLowerCase()}>`);
};

window.document.createElement('div');
// logs: created <div>
```

The DOM doesn't know what rendering means. It fires hooks and lets whoever is listening decide what to do.

## The Hooks interface

The `Hooks` interface defines eleven functions, grouped by what they observe.

### Node lifecycle

| Hook            | Fires when                                             | Arguments               |
| --------------- | ------------------------------------------------------ | ----------------------- |
| `createElement` | An element is created via `document.createElement()`   | `(element, namespace?)` |
| `createText`    | A text node is created via `document.createTextNode()` | `(text, data)`          |

These fire once per node, at creation time. The node is fully initialized — it has an owner document, a tag name, and (for text nodes) its initial data.

### Attribute mutations

| Hook              | Fires when                       | Arguments                                       |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| `setAttribute`    | An attribute is added or changed | `(element, name, value, namespace?, oldValue?)` |
| `removeAttribute` | An attribute is removed          | `(element, name, namespace?, oldValue?)`        |

`setAttribute` fires for any attribute change, including `class`, `id`, `tabindex`, and — critically — `style`. When a `CSSStyleDeclaration` property changes (e.g., `element.style.color = 'red'`), the DOM serializes the entire `cssText` and fires `setAttribute(element, 'style', fullCssText)`. There is no separate style hook. Every inline style mutation is an attribute mutation.

### Text mutations

| Hook      | Fires when                            | Arguments                 |
| --------- | ------------------------------------- | ------------------------- |
| `setText` | A text node's `data` property changes | `(text, data, oldValue?)` |

This fires on assignment to `textNode.data` or `textNode.nodeValue`. Setting `element.textContent` on an element that contains a single text child also triggers this — the element updates the text node's data, which fires the hook.

### Tree mutations

| Hook          | Fires when                          | Arguments                |
| ------------- | ----------------------------------- | ------------------------ |
| `insertChild` | A child is inserted into an element | `(parent, child, index)` |
| `removeChild` | A child is removed from an element  | `(parent, child, index)` |

The `index` is the position in the parent's `childNodes` list. For `insertChild`, it's the index where the child was inserted. For `removeChild`, it's the index the child occupied before removal.

Tree hooks only fire when the parent is an `Element`. Document-level insertions (like appending `<html>` to the Document during construction) don't fire tree hooks.

### Event listener tracking

| Hook                  | Fires when                                      | Arguments                            |
| --------------------- | ----------------------------------------------- | ------------------------------------ |
| `addEventListener`    | A listener is registered on any EventTarget     | `(target, type, listener, options?)` |
| `removeEventListener` | A listener is unregistered from any EventTarget | `(target, type, listener, options?)` |

These let a renderer know which events the application cares about. A terminal renderer might use `addEventListener` notifications to decide when to start capturing mouse input — no mouse listeners means no need to enable mouse tracking in the terminal.

### State transitions

| Hook          | Fires when                             | Arguments                        |
| ------------- | -------------------------------------- | -------------------------------- |
| `focusChange` | The document's active element changes  | `(previousElement, nextElement)` |
| `hoverChange` | The document's hovered element changes | `(previousElement, nextElement)` |

`focusChange` fires during `document.setActiveElement()`, after focus/blur events have been dispatched. `hoverChange` fires during `document.setHoveredElement()`. Both provide the previous and next element so the renderer can update visual state (focus rings, hover highlights) without re-querying the document.

## How hooks work — the slot-and-chain model

`window[HOOKS]` starts as an empty object — `{}`. No hooks installed, no overhead.

Installing a hook means writing a function to one of its properties:

```ts
hooks.createElement = (element) => {
  /* ... */
};
```

But what if something was already there?

This is where the **slot-and-chain** model comes in. Each hook name is a slot. When you install a hook, you:

1. Save the current occupant of the slot (a closure captures it).
2. Write your function as the new occupant.
3. Inside your function, call the saved previous function.

```ts
const previousCreateElement = hooks.createElement;

hooks.createElement = (element, ns) => {
  // Your logic
  console.log(`created <${element.tagName.toLowerCase()}>`);

  // Forward to the previous occupant
  previousCreateElement?.(element, ns);
};
```

The optional chaining (`?.`) handles the case where the slot was empty — `previousCreateElement` is `undefined`, and the call is safely skipped.

Each installation creates a closure that holds a reference to the previous function. The result is an implicit singly-linked list:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Your function  │───▶│ Previous install │───▶│ Earlier install │───▶ undefined
│  (in the slot)  │    │ (in closure)     │    │ (in closure)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

When a DOM mutation fires the hook, the call enters at the slot and propagates through the chain. Every consumer receives the notification.

## Timing guarantees

Hooks fire **synchronously, during the mutation**.

When `element.setAttribute('class', 'active')` executes:

1. The attribute value is updated in the element's `NamedNodeMap`.
2. The `setAttribute` hook fires — your function runs.
3. Control returns to the code that called `setAttribute`.

There is no microtask delay. No batching. No async gap. When your hook function executes, the DOM state has already changed (the attribute is set, the child is inserted, the text is updated), but the code that triggered the mutation hasn't continued yet. You are inside the mutation's call stack.

This synchronous timing is a deliberate design choice. A renderer that needs to stay in lockstep with DOM mutations — updating an internal scene graph, diffing a terminal buffer, sending commands over a wire — gets the notification at exactly the right moment: after the state changed, before anything else happens.

The corollary: your hook runs on the caller's stack. Keep it fast. Avoid triggering additional DOM mutations from inside a hook — the reentrancy won't deadlock (hooks don't hold locks), but it can create confusing call stacks and unexpected hook ordering.

## What hooks are not

### Not DOM events

Hooks look like callbacks, but they share nothing with DOM event propagation. There is no capture phase, no bubble phase, no `stopPropagation`, no `preventDefault`. You cannot "cancel" a mutation through a hook — the mutation has already happened when the hook fires. There is no `removeHook` — once you've written to the slot, the only way to "unsubscribe" is to restore the previous function (which nothing in the system does automatically).

### Not MutationObserver

MutationObserver delivers batched `MutationRecord` objects in a microtask — asynchronously, with type filtering and subtree observation. Hooks fire synchronously, one mutation at a time, through a single chain. MutationObserver is a higher-level abstraction built _on top of_ hooks — the [next section](#mutationobserver-and-hooks) explains how.

### Not Proxy-based observation

@cliui/dom could have wrapped DOM nodes in Proxies to intercept property access and mutation. It doesn't. Every hook invocation is an explicit function call at a specific site in the source code — `NamedNodeMap.setNamedItem()` calls `hooks.setAttribute`, `ParentNode.insertInto()` calls `hooks.insertChild`, and so on. No magic, no traps, no surprising interception of unrelated property access. You can read the code and trace exactly when each hook fires.

## The chaining contract

The hooks bridge is a mutable slot. Anyone can write to it. Nothing in the system prevents you from overwriting a hook without saving the previous function. Nothing warns you when you do.

Think of it as a wiretap on a phone line. You splice into the line — you hear every conversation, and the line continues working for everyone downstream. If you _cut_ the line instead of splicing, everyone downstream goes deaf. Silently.

```ts
// ✘ This cuts the wire
hooks.setAttribute = (element, name, value) => {
  renderAttribute(element, name, value);
};

// ✔ This splices into it
const previous = hooks.setAttribute;
hooks.setAttribute = (element, name, value, ns, oldValue) => {
  renderAttribute(element, name, value);
  previous?.(element, name, value, ns, oldValue);
};
```

The first version overwrites whatever was in the slot. If MutationObserver had already installed its hooks, they're gone. No error is thrown. MutationObserver simply stops receiving attribute mutations. If another renderer had installed hooks before you, it stops receiving too.

This is the **silent failure principle** — the simplicity of the mutable-slot design means the system can't enforce the chaining contract. Breaking the chain produces no error, no warning, no exception. Downstream consumers just go quiet. The bug manifests as "MutationObserver stopped delivering records" or "the other renderer isn't updating," and the cause is a missing line of code in a completely different file.

The discipline is simple: **always save the previous function, always call it**. The consequence of forgetting is proportional to how many other consumers are in the chain.

## MutationObserver and hooks

MutationObserver is a hooks consumer. It's implemented on top of the hooks bridge, not alongside it.

When you call `observer.observe(target, options)` for the first time on a given Window, MutationObserver installs its own hook functions — for `setAttribute`, `removeAttribute`, `setText`, `insertChild`, and `removeChild`. It follows the chaining contract: it saves the previous functions and calls them first.

```
setAttribute slot:
  → MutationObserver's hook (calls →) previous hook (calls →) ...
```

From that point, every attribute/text/tree mutation flows through MutationObserver's hooks. It builds `MutationRecord` objects and enqueues them. In the next microtask, it delivers the batch to your callback.

This layering means:

- **Hooks are synchronous, MutationObserver is asynchronous.** A renderer using hooks directly sees every mutation the instant it happens. A MutationObserver consumer sees a batch of mutations in the next microtask.
- **Hooks are granular, MutationObserver is filtered.** With hooks, you install only the functions you need — `createElement` and `insertChild` and nothing else. MutationObserver subscribes to broad categories (`attributes`, `childList`, `characterData`) and receives everything that matches, requiring you to filter in your callback.
- **Hooks chain, MutationObserver multiplexes.** Multiple MutationObserver instances share a single hook installation per Window. The hook installation happens once; multiple observers can `observe()` different targets with different options on the same Window without additional hook installations.

**Why both?** Renderers need synchronous, low-overhead notification at the moment of mutation. Application code often needs batched, filtered observation — "tell me what changed after this burst of DOM operations finishes." These are different needs served by different timing models, but MutationObserver depends on hooks to function. If a hooks consumer breaks the chain before MutationObserver's hooks, MutationObserver stops working.

## The Symbol identity gotcha

The `HOOKS` constant is a `Symbol` — specifically, `Symbol('hooks')`, created once in `@cliui/dom`'s `constants` module.

`Symbol()` produces a globally unique value every time it's called. Two calls to `Symbol('hooks')` produce two different Symbols, even though they have the same description string. This uniqueness is the feature — it prevents property name collisions on shared objects.

But it creates a problem when bundlers duplicate packages.

If two copies of `@cliui/dom` end up in a dependency tree — one used by your renderer, one used by a framework — each copy executes its own `Symbol('hooks')` call and produces a different value. The renderer writes hooks using Symbol A. The DOM internals fire hooks using Symbol B. They're accessing different properties on the same object. Nothing connects.

The failure is invisible. No error. No type mismatch. The hooks object has two properties — one written by the renderer, one read by the DOM — and they never meet.

**The fix:**

1. **Always import `HOOKS` from `@cliui/dom`.** Never create your own Symbol.

```ts
// ✔ Uses the same Symbol the DOM uses
import {HOOKS} from '@cliui/dom';
window[HOOKS].createElement = /* ... */;

// ✘ Creates a different Symbol — hooks will never fire
const HOOKS = Symbol('hooks');
window[HOOKS].createElement = /* ... */;
```

2. **Ensure a single copy of `@cliui/dom` in your bundle.** Use `peerDependencies` in libraries that depend on it. Check your bundler's deduplication settings. If `npm ls @cliui/dom` shows multiple versions, fix the resolution.

## Installing hooks correctly

A correct hook installation follows three rules: import the Symbol, save the previous function, call it.

You only need to install hooks you care about. A renderer that only handles element creation and tree mutations doesn't need to touch `setText` or `focusChange`. But for every hook you _do_ install, you must chain.

```ts
import {HOOKS} from '@cliui/dom';
import type {Window, Hooks} from '@cliui/dom';

function installRenderer(window: Window) {
  const hooks = window[HOOKS];

  // Save the current occupants
  const prevCreateElement = hooks.createElement;
  const prevSetAttribute = hooks.setAttribute;
  const prevInsertChild = hooks.insertChild;
  const prevRemoveChild = hooks.removeChild;

  hooks.createElement = (element, ns) => {
    prevCreateElement?.(element, ns);
    registerNode(element);
  };

  hooks.setAttribute = (element, name, value, ns, oldValue) => {
    prevSetAttribute?.(element, name, value, ns, oldValue);
    updateAttribute(element, name, value);
  };

  hooks.insertChild = (parent, child, index) => {
    prevInsertChild?.(parent, child, index);
    attachToScene(parent, child, index);
  };

  hooks.removeChild = (parent, child, index) => {
    prevRemoveChild?.(parent, child, index);
    detachFromScene(parent, child);
  };
}
```

**Do:**

- Import `HOOKS` from `@cliui/dom` — use the same Symbol the DOM uses.
- Save the previous function before overwriting each hook.
- Call the previous function in every installed hook, passing all arguments through.
- Install hooks before the first render. Mutations that happen before installation are missed — there's no replay mechanism.

**Don't:**

- Create your own `Symbol('hooks')`. It won't match the one the DOM uses.
- Overwrite hooks without saving the previous function. You'll silently break MutationObserver and any other consumer.
- Assume you're the only hooks consumer. MutationObserver, other renderers, and debugging tools may all install hooks on the same Window.
- Install hooks multiple times on the same Window without guarding against it. Track whether your hooks are already installed to avoid duplicating the chain.

## Where to go next

- **[Building a Rendering Backend](../tutorials/building-a-rendering-backend.md)** — step-by-step tutorial that uses the hooks bridge to build a toy renderer from scratch
- **[MutationObserver — Behavior and Invariants](./mutation-observer.md)** — deep dive into the observer that's built on top of hooks: batching, filtering, subtree observation
- **[Scope and Boundaries](./scope-and-boundaries.md)** — what's supported, what's not, and why
- **[Integrate a Rendering Backend via Hooks](../how-to/integrate-rendering-backend.md)** — quick-reference recipe for hook installation without the conceptual background
