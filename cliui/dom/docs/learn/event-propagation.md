# Event Propagation Model

## Why events travel

A click on a button is also a click on its parent `<div>`, its grandparent `<section>`, and every ancestor up to the document root. The DOM doesn't force you to choose which node "owns" the event — it sends the event through every ancestor, giving each one a chance to respond. This is event propagation: a single dispatch becomes a walk through the tree.

Without propagation, handling events on a list of N items requires N listeners; with propagation, a single listener on the parent handles all of them. This delegation pattern is how frameworks and applications scale event handling without scaling listener count.

@cliui/dom implements standard DOM event propagation: capture phase, at-target, bubble phase, `stopPropagation`, `stopImmediatePropagation`, `preventDefault`. A few behaviors differ from browsers — each deviation is documented with the reasoning behind it, and a [summary table](#differences-from-browser-dom) at the end collects them all.

## Building the path

Before any listener fires, `dispatchEvent` builds the propagation path by walking `parentNode` from the dispatch target up to the root:

```ts
const path = [];
let node = target;
while (node != null) {
  path.push(node);
  node = node.parentNode;
}
// path = [target, parent, grandparent, ..., document]
```

For a typical element in the document body, the path is `[element, ..., body, html, document]` — four ancestors minimum, plus any intermediate containers.

The path is computed once, before dispatch begins, and stored on the event as `event.composedPath()`. The dispatch target is also set as both `event.target` and `event.srcElement` (a legacy alias). This means tree mutations during dispatch don't change the path — listeners that rearrange the DOM mid-propagation won't cause the event to visit nodes that weren't ancestors at dispatch time. Before any dispatch, `composedPath()` returns an empty array.

Window is not in the path. It [extends EventTarget directly, not Node](./dom-architecture.md#eventtarget--everything-listens), so it has no `parentNode` and no position in the tree. If you need to handle events at the window level, add listeners to `window` separately — they won't participate in propagation.

Dispatching an event on a node that isn't connected to the document works — the path is simply `[target]`. This is useful for testing event handlers in isolation without a full DOM tree.

## Three phases — capture, target, bubble

Every dispatched event passes through up to three phases:

| Phase     | `eventPhase` value      | Direction     | What happens                                               |
| --------- | ----------------------- | ------------- | ---------------------------------------------------------- |
| Capture   | `1` (`CAPTURING_PHASE`) | Root → target | Ancestors intercept the event before it reaches the target |
| At target | `2` (`AT_TARGET`)       | —             | The event has arrived at the element it was dispatched on  |
| Bubble    | `3` (`BUBBLING_PHASE`)  | Target → root | The event travels back up the ancestor chain               |

Here's what this looks like for a click on `<button>` inside `<div>` inside `<body>`:

```
            CAPTURE                          BUBBLE
            (root → target)                  (target → root)

document    ① ──── capture listeners ──►     ⑤  ◄── bubble listeners ───
html        ②  ─── capture listeners ──►     ④  ◄── bubble listeners ───
body        ③  ─── capture listeners ──►     ③  ◄── bubble listeners ───
div         ④  ─── capture listeners ──►     ②  ◄── bubble listeners ───
button      ⑤  ─── capture listeners ──►  ●  ①  ◄── bubble listeners ───
                                        TARGET
```

The key architectural insight: the dispatch algorithm is **two separate loops** — a capture pass and a bubble pass — each looking up listeners by a different key. Everything in this doc flows from that design: at-target ordering, capture/bubble independence, and how propagation control works at the target.

### Capture — intercepting before arrival

The path is traversed in reverse — from the root down to the target. At each node, only **capture listeners** fire (those registered with `{capture: true}` or the boolean `true` as the third argument to `addEventListener`).

```ts
// This listener fires during the capture phase
parent.addEventListener('click', handler, {capture: true});
// Shorthand:
parent.addEventListener('click', handler, true);
```

Capture exists for a specific reason: it lets ancestors act before the target sees the event. A top-level error boundary, a focus-management layer, a keyboard shortcut interceptor — these need to handle (or suppress) events before child handlers run. Without capture, there's no way to reliably intercept an event before it reaches its destination.

### At target — the dispatch origin

The target node is visited **twice** during dispatch — once at the end of the capture pass, and once at the beginning of the bubble pass. On both visits, `eventPhase` is set to `AT_TARGET` (value `2`), regardless of which loop is currently running. This is how you detect that you're handling the event on the element it originated from, not on an ancestor.

Note: unlike browsers, `currentTarget` and `eventPhase` are not reset after dispatch completes. They retain the values from the last listener invocation. If you inspect the event object after `dispatchEvent` returns, you'll see the state from the final node visited, not `null` / `NONE`.

Because capture and bubble listeners are looked up separately, capture listeners on the target fire first (during the capture pass), then bubble listeners fire (during the bubble pass). This differs from browsers — see [At-target ordering](#at-target-ordering--a-deliberate-divergence) immediately below.

### Bubble — the delegation surface

The path is traversed forward — from the target back up to the root. At each node, only **non-capture listeners** fire. This is the default: listeners registered without `{capture: true}` are bubble listeners.

```ts
// This listener fires during the bubble phase
parent.addEventListener('click', handler);
```

Most event handling happens here. The delegation pattern — a single listener on a parent element that handles events from many children — depends entirely on bubbling. The event rises through ancestors, and any ancestor with a matching listener gets a chance to respond.

## At-target ordering — a deliberate divergence

In the standard DOM (since DOM Level 3), listeners at the target fire in registration order regardless of the `capture` flag. In @cliui/dom, capture listeners at the target always fire before bubble listeners, because the capture and bubble passes are separate loops with separate listener lookups.

```ts
const target = document.createElement('div');

target.addEventListener('click', () => console.log('bubble'), false);
target.addEventListener('click', () => console.log('capture'), true);

target.dispatchEvent(new Event('click', {bubbles: true}));
// @cliui/dom:  "capture", "bubble"
// Browser DOM: "bubble", "capture" (registration order)
```

Why the difference? Merging capture and bubble listeners into a single registration-ordered list at the target requires either a combined data structure or a special-case branch in the dispatch loop. The two-loop design is simpler and keeps the capture/bubble separation clean everywhere in the path. The trade-off: code that registers both capture and non-capture listeners on the **same element** that dispatches the event and depends on their relative ordering will see a different sequence. For listeners on ancestor elements, the capture-then-bubble ordering matches browsers exactly.

This two-loop design also affects how `stopPropagation()` behaves at the target — see [Controlling propagation](#controlling-propagation) for the details.

## When events don't bubble

Events with `bubbles: false` (like `focus` and `blur`) skip the bubble phase on ancestor nodes. But capture still traverses the full path — "non-bubbling" means "doesn't rise back up," not "only fires on the target."

Non-capture listeners on the target itself still fire, even for non-bubbling events — the bubble pass always visits the target node. Only ancestors are excluded.

```ts
const parent = document.createElement('div');
const child = document.createElement('span');
parent.appendChild(child);
document.body.appendChild(parent);

// Capture listeners on ancestors fire — capture traverses the full path
parent.addEventListener('focus', handler, true); // ✔ fires

// Non-capture listeners on the TARGET fire — the target is always visited
child.addEventListener('focus', handler); // ✔ fires

// Non-capture listeners on ANCESTORS do not fire — non-bubbling skips them
parent.addEventListener('focus', handler); // ✘ does not fire

child.dispatchEvent(new Event('focus')); // bubbles defaults to false
```

This distinction matters because capture is the only reliable way to observe non-bubbling events on ancestor elements. If you need a document-level focus tracker, you must use `{capture: true}` — a bubble-phase listener on `document` will never see `focus` events from descendants.

## Controlling propagation

Two methods control whether the event continues traveling. The difference between them is scope — one stops after the current listener set, the other stops immediately.

### `stopPropagation()`

Prevents the event from moving to the next node in the path. Remaining listeners in the **currently firing set** (capture or bubble) still fire, but no further nodes are visited.

```ts
element.addEventListener('click', (e) => {
  e.stopPropagation();
  // Other click listeners in the same set on this element still run
  // The event won't propagate to the next node
});
```

At the dispatch target, capture and bubble listeners are in different passes. Calling `stopPropagation()` in a target capture listener prevents the later bubble pass from running — including bubble listeners on the target itself. This is a consequence of the [two-loop architecture](#at-target-ordering--a-deliberate-divergence) and differs from browser behavior, where `stopPropagation()` at the target only prevents propagation to other nodes.

### `stopImmediatePropagation()`

Stops everything — remaining listeners in the current set are skipped, and the event doesn't move to the next node.

```ts
element.addEventListener('click', (e) => {
  e.stopImmediatePropagation();
  // No other click listeners on this element will run
  // The event won't propagate further
});
```

Both methods work in any phase — capture, at-target, or bubble. Under the hood, both set `cancelBubble = true` (which `dispatchEvent` checks after each node). `stopImmediatePropagation` additionally breaks out of the listener iteration loop.

## Errors don't break the chain

Listener exceptions don't stop propagation. If a listener throws, the error is rethrown asynchronously via `setTimeout` so it surfaces in the console without disrupting other listeners or subsequent phases. Remaining listeners on the current node continue to fire, and the event continues propagating.

```ts
element.addEventListener('click', () => {
  throw new Error('This does not stop propagation');
});

element.addEventListener('click', () => {
  console.log('This still runs');
});
```

The design rationale: a single broken listener should not silence the rest of the application. If errors were synchronous and propagation-stopping, one bad handler in a deeply nested component could prevent every ancestor from seeing the event — including error boundaries and cleanup logic. Async rethrowing preserves the error for debugging while keeping the event system resilient.

## Listener registration

Capture and non-capture listeners are stored separately and looked up independently. This separation produces three behaviors worth knowing:

- You can register the same function as both a capture and bubble listener — they're tracked in separate sets.
- Duplicate detection works within each set independently. Adding the same function twice to the same set (capture or bubble) is a no-op for ordinary listeners.
- `removeEventListener` must specify the same `capture` option used during `addEventListener`, or it won't find the listener. Passing `{capture: true}` to `addEventListener` and omitting it from `removeEventListener` leaves the listener in place.

Capture can be specified as `{capture: true}` in an options object or as the boolean `true` as the third argument to `addEventListener`:

```ts
// These are equivalent
element.addEventListener('click', handler, {capture: true});
element.addEventListener('click', handler, true);
```

## Listener options

### `once`

The listener fires at most once, then removes itself automatically.

```ts
element.addEventListener('click', handler, {once: true});
// After the first click event, handler is automatically removed
```

Removing a `once` listener before it fires works correctly — the library tracks the internal wrapper, so `removeEventListener` finds and removes the right function.

### `signal`

An `AbortSignal` that removes the listener when aborted. This ties listener lifetime to a controller, which is useful for cleanup — abort the controller and all associated listeners are removed, no manual bookkeeping required.

```ts
const controller = new AbortController();

element.addEventListener('click', handler, {signal: controller.signal});

// Later: remove the listener
controller.abort();
```

Note: an already-aborted signal does not prevent registration. The implementation listens for a future `abort` event but does not check `signal.aborted` at registration time.

### `passive`

Accepted for API compatibility but has no behavioral effect. In browsers, `passive: true` tells the engine it's safe to scroll without waiting for `preventDefault()`. There's no scrolling in @cliui/dom, so the option is acknowledged and ignored. Code that sets `{passive: true}` won't break — it just won't do anything beyond what it already does.

## EventListenerObject support

Listeners can be objects with a `handleEvent` method, not just functions:

```ts
const handler = {
  handleEvent(event: Event) {
    // `this` is the handler object, not the element
    console.log(event.type);
  },
};

element.addEventListener('click', handler);
```

For function listeners, `this` is set to the `currentTarget` (the element the listener is registered on). For object listeners, `this` is the object itself — `handleEvent` is called as a method. This distinction matters for frameworks that pass handler objects rather than closures.

## `preventDefault()` and the inverted return value

`preventDefault()` sets `event.defaultPrevented = true`. Unlike browsers, this happens unconditionally — `preventDefault()` does not check the `cancelable` flag. Calling `preventDefault()` on a non-cancelable event still sets `defaultPrevented = true`.

Most default-action patterns in @cliui/dom are application-level: frameworks check `defaultPrevented` to implement their own defaults. But built-in behavior does consult it too — for example, pressing Escape in a modal `<dialog>` dispatches a cancelable `cancel` event, and the dialog only closes if `preventDefault()` was not called.

> **⚠️ Porting note:** `dispatchEvent` returns `event.defaultPrevented` — `true` when `preventDefault()` was called, `false` otherwise. **This inverts the browser convention**, where `dispatchEvent` returns `false` when the event was cancelled. Code that checks `if (!el.dispatchEvent(event))` to detect cancellation needs to be inverted to `if (el.dispatchEvent(event))`.

```ts
element.addEventListener('click', (e) => e.preventDefault());

element.dispatchEvent(new Event('click', {cancelable: true}));
// Returns true — preventDefault() was called
// In a browser, this would return false
```

The browser convention (`true` means "not cancelled") reads backward from how most code uses the return value. @cliui/dom returns what most callers actually want to know: _did something call preventDefault?_ If you're porting browser code that checks `dispatchEvent()`'s return value, be aware of this flip.

## The `composed` property

`Event` accepts a `composed` option in its constructor and stores it as a property. `composedPath()` returns the propagation path. But `composed` has no effect on propagation behavior — there are no [shadow DOM boundaries](./scope-and-boundaries.md#shadow-dom-and-slots) to cross. The property exists so that code which sets or reads `composed` doesn't break, not because it changes anything.

## `isTrusted`

All events have `isTrusted: false`. There is no mechanism for creating trusted events — every event is constructed via `new Event()` or a subclass. In a browser, the distinction separates user-initiated events (trusted) from script-initiated events (untrusted). Without user input hardware, the distinction doesn't apply.

## Differences from browser DOM

@cliui/dom's event propagation is standard DOM with a few deliberate deviations and omissions. If you're porting browser code, these are the behaviors to watch for:

| Behavior                            | @cliui/dom                                           | Browser DOM                                            |
| ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| `dispatchEvent` return value        | Returns `defaultPrevented` (`true` = cancelled)      | Returns `!defaultPrevented` (`false` = cancelled)      |
| At-target listener ordering         | Capture listeners fire before bubble listeners       | All listeners fire in registration order               |
| `stopPropagation()` at target       | Capture-phase stop prevents target bubble listeners  | Other listeners on the same node still fire            |
| `preventDefault()` and `cancelable` | Always sets `defaultPrevented`, ignores `cancelable` | Only sets `defaultPrevented` if `cancelable` is `true` |
| Propagation path                    | `[target, ..., document]` — Window excluded          | `[target, ..., document, window]`                      |
| Event state after dispatch          | `currentTarget` and `eventPhase` retain last values  | Reset to `null` and `NONE` (0)                         |
| `isTrusted`                         | Always `false`                                       | `true` for user-initiated events                       |
| `composed`                          | Stored but no behavioral effect                      | Controls cross-shadow-boundary propagation             |
| `passive`                           | Accepted, ignored                                    | Prevents `preventDefault()` in listener                |
| `signal` (already aborted)          | Listener is still registered                         | Listener is not registered                             |

## Hooks integration

`addEventListener` and `removeEventListener` fire hooks on the [hooks bridge](./hooks-bridge.md), allowing renderers to track which events the application handles. A terminal renderer might use this to enable mouse tracking only when mouse event listeners exist — no mouse listeners means no need to send mouse escape sequences to the terminal. This is the same pattern described in [the hooks bridge doc](./hooks-bridge.md#event-listener-tracking): the renderer reacts to what the application cares about, rather than polling or guessing.

## Where to go next

- **[DOM Architecture](./dom-architecture.md)** — EventTarget as the root of the class hierarchy, and how every node gets event capabilities
- **[The Hooks Bridge](./hooks-bridge.md)** — how renderers observe DOM mutations, including event listener registration
- **[Scope and Boundaries](./scope-and-boundaries.md)** — what's supported (and not) in @cliui/dom, including shadow DOM and `composed`
