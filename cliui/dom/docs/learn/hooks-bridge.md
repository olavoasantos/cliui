# The Hooks Bridge — How Renderers Observe the DOM

## The contract between state and rendering

@cliui/dom [separates DOM-based systems into two layers](./what-is-cliui-dom.md#two-layers-state-and-rendering): the DOM stores state (tree structure, attributes, styles, text, event listeners), and a renderer reads that state to produce output. The hooks bridge is the API Layer 2 uses to observe Layer 1.

Every `Window` instance exposes `window[HOOKS]`: a plain object with optional callbacks, one per hook slot. Each Window has its own independent hooks object — a renderer supporting multiple windows must install hooks on each one separately. A renderer installs functions on this object. From that point forward, every hook notification fires synchronously as the DOM changes, and the renderer receives it.

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

Note that `new Window()` constructs the initial document tree — `<html>`, `<head>`, and `<body>` — during construction. Hooks installed afterward observe future mutations only. If your renderer needs to know about the existing tree, traverse it once after installation.

## The Hooks interface

The `Hooks` interface defines eleven callbacks, grouped by what they observe. All hooks fire synchronously, inside the mutation's call stack, after the DOM state has changed. The [slot-and-chain model](#how-hooks-work--the-slot-and-chain-model) below explains how multiple consumers share these hooks.

### Node creation

| Hook            | Fires when                                                                  | Arguments               |
| --------------- | --------------------------------------------------------------------------- | ----------------------- |
| `createElement` | An element is created via `document.createElement()` or `createElementNS()` | `(element, namespace?)` |
| `createText`    | A text node is created via `document.createTextNode()`                      | `(text, data)`          |

These fire once per node, at creation time. The node is fully initialized — it has an owner document, a tag name, and (for text nodes) its initial data — but it is not yet inserted into any tree. There is no `createComment` hook; comment node creation is not observed.

Note that `createText` is also triggered indirectly by string coercion paths like `element.append('text')`, which create text nodes internally. The `data` argument is always `String(data)` — for `null` or `undefined` inputs, the hook receives `'null'` or `'undefined'` even though the text node itself normalizes storage to `''`.

### Attribute mutations

| Hook              | Fires when                       | Arguments                                       |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| `setAttribute`    | An attribute is added or changed | `(element, name, value, namespace?, oldValue?)` |
| `removeAttribute` | An attribute is removed          | `(element, name, namespace?, oldValue?)`        |

`setAttribute` fires for any attribute change, including `class`, `id`, `tabindex`, and `style`. When a `CSSStyleDeclaration` property changes (e.g., `element.style.color = 'red'`), the style system serializes the full `cssText` and reports it through the hooks bridge as `setAttribute(element, 'style', cssText)`. There is no separate style hook — for hook consumers, inline style changes arrive as attribute mutations. Note that this is a hook-level notification only: the inline style change does not update the element's attribute map, so `element.getAttribute('style')` is not affected. See [CSSStyleDeclaration](./css-style-declaration.md) for details on the style/attribute boundary.

`setAttribute` is deduplicated when called through `element.setAttribute()` — setting an attribute to its current value does not fire the hook.

**Argument variability.** Not all `setAttribute` call sites pass the same arguments. The primary path (`element.setAttribute(...)`) provides all five arguments including `oldValue`. But inline style changes provide only three — `(element, 'style', cssText)` — with no `namespace` and no `oldValue`. Direct `Attr.value` writes provide four — no `oldValue` — and also bypass deduplication, firing the hook even when the value hasn't changed. A renderer that relies on `oldValue` for diffing should treat `undefined` as "unknown previous value."

### Text mutations

| Hook      | Fires when                            | Arguments                 |
| --------- | ------------------------------------- | ------------------------- |
| `setText` | A text node's `data` property changes | `(text, data, oldValue?)` |

This fires on assignment to `textNode.data` or `textNode.nodeValue`. Setting `element.textContent` on an element that contains a single text child also triggers this — the element updates the text node's data, which fires the hook.

Unlike `setAttribute`, `setText` has no deduplication — assigning `textNode.data` to its current value still fires the hook. A renderer that skips updates when the value hasn't changed should compare against the `oldValue` argument rather than assuming hooks only fire on actual changes.

### Tree mutations

| Hook          | Fires when                          | Arguments                |
| ------------- | ----------------------------------- | ------------------------ |
| `insertChild` | A child is inserted into an element | `(parent, child, index)` |
| `removeChild` | A child is removed from an element  | `(parent, child, index)` |

The `index` is the position in the parent's `childNodes` list. For `insertChild`, it's the index where the child was inserted. For `removeChild`, it's the index the child occupied before removal.

Tree hooks only fire when the parent is an `Element`. Document-level insertions (like appending `<html>` to the Document during construction) and `DocumentFragment`-level insertions don't fire tree hooks. When a `DocumentFragment` is appended to an element, each child is inserted individually — the fragment itself doesn't appear in any hook call.

### Event listener tracking

| Hook                  | Fires when                                               | Arguments                            |
| --------------------- | -------------------------------------------------------- | ------------------------------------ |
| `addEventListener`    | A listener is registered on a document-owned EventTarget | `(target, type, listener, options?)` |
| `removeEventListener` | A listener is removed from a document-owned EventTarget  | `(target, type, listener, options?)` |

These let a renderer know which events the application cares about. A terminal renderer might use `addEventListener` notifications to decide when to start capturing mouse input — no mouse listeners means no need to enable mouse tracking in the terminal.

Listener hooks only fire for EventTargets that have an owner document — elements, text nodes, the document itself. `window.addEventListener(...)` does not fire hooks, because `Window` is not a document-owned node. Standalone `EventTarget` instances similarly don't participate.

`addEventListener` fires only after a successful registration. Duplicate calls with the same listener don't re-notify. `removeEventListener` fires only when a listener is actually removed — calling it with a listener that was never added is a no-op that produces no hook notification. When a listener is registered with `{ once: true }`, the hook receives the original unwrapped listener, not the internal once-wrapper.

### State transitions

| Hook          | Fires when                             | Arguments                                            |
| ------------- | -------------------------------------- | ---------------------------------------------------- |
| `focusChange` | The document's active element changes  | `(previous: Element, next: Element)`                 |
| `hoverChange` | The document's hovered element changes | `(previous: Element \| null, next: Element \| null)` |

`focusChange` fires inside `document.setActiveElement()`, after `blur`/`focusout` events have been dispatched on the previous element and `document.activeElement` has been updated, but before `focus`/`focusin` events fire on the new element. Both arguments are always elements — `focusChange` never receives `null` because the active element falls back to `document.body`.

`hoverChange` fires during `document.setHoveredElement()`. Either argument can be `null` — `previous` is `null` when nothing was previously hovered, `next` is `null` when the hover leaves all elements.

### Hook contract at a glance

| Hook                  | Signature                                        | Dedup                | Fires after                                 | Scope limits                                           |
| --------------------- | ------------------------------------------------ | -------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `createElement`       | `(element, ns?)`                                 | —                    | Node initialized                            | All elements                                           |
| `createText`          | `(text, data)`                                   | —                    | Node initialized                            | All text nodes                                         |
| `setAttribute`        | `(el, name, value, ns?, oldValue?)`              | Via `setAttribute()` | `attributeChangedCallback`\*                | \*`Attr.value` and style paths skip callback and dedup |
| `removeAttribute`     | `(el, name, ns?, oldValue?)`                     | —                    | `attributeChangedCallback`                  | Only fires when attribute exists                       |
| `setText`             | `(text, data, oldValue?)`                        | No                   | State changed                               | Fires even for same-value assignments                  |
| `insertChild`         | `(parent, child, index)`                         | —                    | `connectedCallback` (if connected)          | Element parents only; fragments expand per-child       |
| `removeChild`         | `(parent, child, index)`                         | —                    | `disconnectedCallback` (if connected)       | Element parents only                                   |
| `addEventListener`    | `(target, type, listener, options?)`             | —                    | Listener added                              | Document-owned EventTargets only                       |
| `removeEventListener` | `(target, type, listener, options?)`             | —                    | Listener removed                            | Document-owned EventTargets; only on actual removal    |
| `focusChange`         | `(prev: Element, next: Element)`                 | —                    | `blur`/`focusout`; before `focus`/`focusin` | Never `null`                                           |
| `hoverChange`         | `(prev: Element \| null, next: Element \| null)` | —                    | State changed                               | Either arg may be `null`                               |

## How hooks work — the slot-and-chain model

`window[HOOKS]` starts as an empty object — `{}`. No hooks installed, no overhead.

Installing a hook means writing a function to one of its properties:

```ts
const hooks = window[HOOKS];

hooks.createElement = (element) => {
  /* ... */
};
```

But what if something was already there?

Because each slot holds only one function, coexistence depends on chaining. Each hook name is a slot. When you install a hook, you:

1. Save the current occupant of the slot (a closure captures it).
2. Write your function as the new occupant.
3. Inside your function, call the saved previous function.

```ts
const hooks = window[HOOKS];
const previousCreateElement = hooks.createElement;

hooks.createElement = (element, ns) => {
  // Forward to the previous occupant
  previousCreateElement?.(element, ns);

  // Your logic
  console.log(`created <${element.tagName.toLowerCase()}>`);
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
2. If the element is a custom element with an `attributeChangedCallback`, that callback runs.
3. The `setAttribute` hook fires — your function runs.
4. Control returns to the code that called `setAttribute`.

The same pattern holds for tree mutations: when the parent is connected to the document, `connectedCallback` and `disconnectedCallback` fire before `insertChild` and `removeChild` hooks, respectively. By the time your hook runs, custom element lifecycle callbacks have already executed — and those callbacks may have triggered additional DOM mutations with their own hook notifications. When operating on a detached subtree, no lifecycle callbacks fire, but the hooks still do.

There is no microtask delay. No batching. No async gap. When your hook function executes, the DOM state has already changed (the attribute is set, the child is inserted, the text is updated), but the code that triggered the mutation hasn't continued yet. You are inside the mutation's call stack.

This synchronous timing is a deliberate design choice. A renderer that needs to stay in lockstep with DOM mutations — updating an internal scene graph, diffing a terminal buffer, sending commands over a wire — gets the notification at exactly the right moment: after the state changed, before the caller resumes.

The corollary: your hook runs on the caller's stack. Keep it fast. Avoid triggering additional DOM mutations from inside a hook — re-entrant mutations will recursively fire hooks. There is no guard against infinite recursion: if your hook triggers a mutation that fires the same hook, you'll overflow the stack.

## What hooks are not

### Not DOM events

Hooks look like callbacks, but they share nothing with DOM event propagation. There is no capture phase, no bubble phase, no `stopPropagation`, no `preventDefault`. You cannot "cancel" a mutation through a hook — the mutation has already happened when the hook fires. There is no `removeHook` API — once you've written to the slot, the only way to unsubscribe is to restore the previous function. The hooks bridge provides no lifecycle management; consumers that need to detach must save and restore previous hooks themselves.

### Not MutationObserver

MutationObserver delivers batched `MutationRecord` objects in a microtask — asynchronously, with type filtering and subtree observation. Hooks fire synchronously, one mutation at a time, through a single chain. MutationObserver is a higher-level abstraction built _on top of_ hooks — [a later section](#mutationobserver-and-hooks) explains how.

### Not Proxy-based observation

@cliui/dom could have wrapped DOM nodes in Proxies to intercept property access and mutation. It doesn't. Every hook invocation is an explicit function call at a specific site in the source code — `NamedNodeMap.setNamedItem()` calls `hooks.setAttribute`, `ParentNode.insertInto()` calls `hooks.insertChild`, and so on. No magic, no traps, no surprising interception of unrelated property access. You can read the code and trace exactly when each hook fires.

### Why mutable slots?

An event bus or pub/sub system would give you add/remove semantics, multiple listeners without chaining discipline, and no silent failure mode. The mutable-slot design trades that safety for simplicity: zero allocation overhead when unused, direct function calls with no dispatch indirection, and a deliberately minimal API surface. The hooks bridge sits on hot paths — every DOM mutation flows through it — so the design prioritizes minimal overhead. The cost is that the chaining contract relies on consumer discipline rather than system enforcement.

## The chaining contract

The hooks bridge is a mutable slot. Anyone can write to it. Nothing in the system prevents you from overwriting a hook without saving the previous function. Nothing warns you when you do.

Think of it as a wiretap on a phone line. You splice into the line — you hear every conversation, and the line continues working for everyone downstream. If you _cut_ the line instead of splicing, everyone downstream goes deaf. Silently.

```ts
const hooks = window[HOOKS];

// ✘ This cuts the wire
hooks.setAttribute = (element, name, value) => {
  renderAttribute(element, name, value);
};

// ✔ This splices into it
const previous = hooks.setAttribute;
hooks.setAttribute = (element, name, value, ns, oldValue) => {
  previous?.(element, name, value, ns, oldValue);
  renderAttribute(element, name, value);
};
```

The first version overwrites whatever was in the slot. If MutationObserver had already installed its hooks, they're gone. No error is thrown. MutationObserver simply stops receiving attribute mutations. If another renderer had installed hooks before you, it stops receiving too.

This is the **silent failure principle** — the simplicity of the mutable-slot design means the system can't enforce the chaining contract. Breaking the chain produces no error, no warning, no exception. Downstream consumers just go quiet. The bug manifests as "MutationObserver stopped delivering records" or "the other renderer isn't updating," and the cause is a missing line of code in a completely different file.

The discipline is simple: **always save the previous function, always call it**. The consequence of forgetting is proportional to how many other consumers are in the chain.

There's a subtler variant: never replace `window[HOOKS]` with a new object. Consumers chain by mutating properties on the existing object. If you write `window[HOOKS] = { createElement: myHook }`, any consumer that previously saved a reference to the old object's properties is now writing to a detached object. Always mutate properties in place.

## MutationObserver and hooks

MutationObserver is a hooks consumer. It's implemented on top of the hooks bridge, not alongside it.

When you call `observer.observe(target, options)` for the first time on a given Window, MutationObserver installs its own hook functions — for `setAttribute`, `removeAttribute`, `setText`, `insertChild`, and `removeChild` (five of the eleven hooks). It does not observe node creation, event listeners, focus, or hover. It follows the chaining contract: it saves the previous functions and calls them first.

```
setAttribute slot:
  → MutationObserver's hook (calls →) previous hook (calls →) ...
```

From that point, every attribute/text/tree mutation flows through MutationObserver's hooks. It builds `MutationRecord` objects and enqueues them. In the next microtask, it delivers the batch to your callback.

Hook wrappers are installed once per Window and remain in place permanently. Calling `disconnect()` unregisters the observer from receiving records, but does not uninstall the hook wrappers. This means a hooks consumer that breaks the chain after MutationObserver's installation can permanently silence observation — calling `observe()` again won't reinstall the wrappers.

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

**Do:**

- Import `HOOKS` from `@cliui/dom` — use the same Symbol the DOM uses.
- Save the previous function before overwriting each hook.
- Call the previous function in every installed hook, passing all arguments through.
- Install hooks before the first DOM manipulation. `new Window()` already constructs the document skeleton; if your renderer needs to know about existing nodes, walk the tree once after installation.
- Mutate properties on the existing `window[HOOKS]` object. Never replace the object itself.

**Don't:**

- Create your own `Symbol('hooks')`. It won't match the one the DOM uses.
- Overwrite hooks without saving the previous function. You'll silently break MutationObserver and any other consumer.
- Replace `window[HOOKS]` with a new object. Existing consumers hold references to the old object's properties.
- Assume you're the only hooks consumer. MutationObserver, other renderers, and debugging tools may all install hooks on the same Window.
- Install hooks multiple times on the same Window without guarding against it. Track whether your hooks are already installed to avoid duplicating the chain.

## Where to go next

- **[MutationObserver — Behavior and Invariants](./mutation-observer.md)** — deep dive into the observer that's built on top of hooks: batching, filtering, subtree observation
- **[Scope and Boundaries](./scope-and-boundaries.md)** — what's supported, what's not, and why
