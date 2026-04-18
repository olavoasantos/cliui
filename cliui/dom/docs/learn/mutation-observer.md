# MutationObserver — Behavior and Invariants

## The timing problem

Renderers need to know about every DOM mutation the instant it happens. Application code has a different need: it wants to know _what changed_ after a burst of work finishes — not during it. An undo system doesn't care about each individual `setAttribute` call; it cares about the net result of a user action. A state synchronizer doesn't want to fire on every `appendChild` in a loop; it wants one notification with the full batch.

These are fundamentally different timing requirements. The [hooks bridge](./hooks-bridge.md) serves the first — synchronous, per-mutation, inside the caller's stack. MutationObserver serves the second — asynchronous, batched, delivered after the synchronous work completes.

## Watching a node for changes

Create an observer with a callback. Call `observe()` with a target node and options specifying which mutation types to watch.

```ts
import {Window, MutationObserver} from '@cliui/dom';

const window = new Window();
const document = window.document;
const element = document.createElement('div');
document.body.appendChild(element);

const observer = new MutationObserver((records) => {
  for (const record of records) {
    console.log(record.type, record.attributeName ?? record.target);
  }
});

observer.observe(element, {
  attributes: true,
  childList: true,
  characterData: true,
  subtree: true,
});
```

### Three categories of change

MutationObserver groups all DOM mutations into three types, each controlled by a boolean option:

| Option          | Mutation type   | What it catches                                                             |
| --------------- | --------------- | --------------------------------------------------------------------------- |
| `attributes`    | `attributes`    | `setAttribute`, `removeAttribute`, inline style changes via `element.style` |
| `characterData` | `characterData` | Text node and comment node `data` changes                                   |
| `childList`     | `childList`     | `appendChild`, `removeChild`, `insertBefore`, `replaceChild`\*              |

\* `replaceChild` produces **two** records — one removal, one insertion — because it calls `removeChild` then inserts the new child internally.

At least one must be `true`, or `observe()` throws a `TypeError`. This constraint exists because an observer that watches nothing would silently accumulate overhead without ever delivering a record — a bug that's hard to diagnose.

**Note on `childList` scope:** Tree mutation hooks only fire when the parent is an `Element`. Mutations to `Document` direct children (e.g., the `<html>` element during construction) and `DocumentFragment` children are not observed. When a `DocumentFragment` is appended to an element, each child is inserted individually — the fragment itself never appears in hook calls — so `childList` observation works for the resulting per-child insertions, but observing a `DocumentFragment` directly has no effect.

### Record anatomy

Each mutation type produces records with a predictable shape:

| Field           | `attributes`             | `characterData`          | `childList`        |
| --------------- | ------------------------ | ------------------------ | ------------------ |
| `type`          | `'attributes'`           | `'characterData'`        | `'childList'`      |
| `target`        | The element              | The text or comment node | The parent element |
| `attributeName` | The attribute name       | `null`                   | `null`             |
| `oldValue`      | Previous value or `null` | Previous data or `null`  | `null` (always)    |
| `addedNodes`    | `[]` (always empty)      | `[]` (always empty)      | Inserted nodes     |
| `removedNodes`  | `[]` (always empty)      | `[]` (always empty)      | Removed nodes      |

`oldValue` is `null` unless the observer set `attributeOldValue: true` (for attributes) or `characterDataOldValue: true` (for character data). For `childList` records, `oldValue` is always `null`.

### Option inference

Some options imply others:

- `attributeOldValue: true` implies `attributes: true` — you don't need to set both.
- `characterDataOldValue: true` implies `characterData: true`.

If you set `attributeOldValue: true` without explicitly setting `attributes`, the observer infers it. This matches browser behavior.

### Narrowing with attributeFilter

Most application code cares about specific attributes, not all of them. `attributeFilter` limits which attributes generate records — reducing noise and keeping your callback focused:

```ts
observer.observe(element, {
  attributes: true,
  attributeFilter: ['class', 'style'],
});
// Only fires for class and style changes — id, tabindex, etc. are ignored.
```

### Subtree observation

By default, an observer only watches the target node itself. Set `subtree: true` to observe all descendants:

```ts
observer.observe(container, {
  childList: true,
  subtree: true,
});
// Fires for insertions/removals anywhere inside container, not just direct children.
```

Target matching walks the `parentNode` chain from the mutation target upward. If any ancestor is the observed target, the record matches.

### Re-observing replaces, it doesn't merge

Calling `observe()` on a target you're already observing **replaces** the options — it doesn't merge them. This applies per `(observer, target)` pair — different observer instances can observe the same target with different options without conflict.

```ts
observer.observe(element, {attributes: true, childList: true});
observer.observe(element, {attributes: true});
// Now only observing attributes — childList is no longer watched.
```

The rationale: merging options would make it impossible to _narrow_ an observation without disconnecting and re-observing. Replacement gives you full control.

## Why batching matters

MutationObserver doesn't call your callback synchronously. Mutations are collected, and the callback fires in the next microtask with all accumulated records.

```ts
element.setAttribute('class', 'a');
element.setAttribute('id', 'b');
element.appendChild(document.createElement('span'));
// Nothing has been delivered yet.

// ...microtask boundary...
// Callback fires once with three records: two attribute, one childList.
```

This batching is the fundamental difference between MutationObserver and direct hooks. Hooks fire synchronously, one call per mutation, inside the caller's stack. MutationObserver collects and delivers after the synchronous work is done.

The design choice behind batching is efficiency. A framework reconciliation might touch dozens of attributes and rearrange many children in a single synchronous pass. Firing a callback for each mutation would force the observer's consumer to handle partial states — the tree mid-reconciliation, attributes half-updated. Batching guarantees the callback sees a coherent snapshot: all the mutations from one synchronous execution, delivered together, after the dust settles.

The batching mechanism: when `enqueue()` adds a record and no microtask is scheduled, it calls `queueMicrotask()` and sets a `scheduled` flag. Subsequent mutations within the same task push records without scheduling another microtask. When the microtask fires, it resets the flag, drains the records, and invokes the callback.

### Draining records early with takeRecords()

`takeRecords()` drains the pending records synchronously and returns them. The callback won't fire for those records — they've been consumed.

```ts
element.setAttribute('class', 'a');
element.setAttribute('id', 'b');

const records = observer.takeRecords();
// records has two entries. The scheduled microtask still fires,
// but finds nothing to deliver — the callback is not invoked.
```

This is useful in performance-sensitive scenarios where you want to process records immediately rather than waiting for the microtask — for instance, at the boundary of a known synchronous operation where you can handle the batch yourself.

## Per-observer record resolution

Each observer gets its own clone of each matching record. The `addedNodes` and `removedNodes` arrays are copied per observer.

The `oldValue` field depends on the observer's options, not on the mutation. The hooks infrastructure always captures `oldValue` when the DOM operation provides it. At clone time, the observer's options act as a filter — you only receive it if you asked for it:

- If the record is an `attributes` mutation and the observer set `attributeOldValue: true`, it gets the old value. Otherwise `null`.
- If the record is a `characterData` mutation and the observer set `characterDataOldValue: true`, it gets the old value. Otherwise `null`.

```ts
const observerA = new MutationObserver((records) => {
  console.log(records[0].oldValue); // 'previous-class'
});

const observerB = new MutationObserver((records) => {
  console.log(records[0].oldValue); // null
});

observerA.observe(element, {attributes: true, attributeOldValue: true});
observerB.observe(element, {attributes: true});

element.setAttribute('class', 'new-class');
```

Two observers, same mutation, different `oldValue` — because each gets a clone resolved against its own options. This per-observer resolution is why records are cloned rather than shared: the same mutation can produce different records depending on who's watching.

**Note on style mutations:** Changes through `element.style` (the CSSStyleDeclaration API) produce `attributes` records with `attributeName: 'style'`, but `oldValue` is always `null` regardless of `attributeOldValue` settings. The CSSStyleDeclaration notification path does not capture the previous `cssText`. Only direct `setAttribute('style', ...)` calls provide the old value. If you need to track style changes for diffing, compare against your own snapshot rather than relying on `oldValue`.

## disconnect()

`disconnect()` clears all observations and removes the observer from the per-Window store. After disconnecting, no new mutations will be observed.

```ts
observer.disconnect();
```

**Pending records are not cleared.** Unlike the browser spec — which says `disconnect()` should empty the record queue — this implementation does not clear already-enqueued records or cancel a scheduled microtask. If mutations were enqueued before `disconnect()`, the callback may still fire for those records when the microtask runs.

To guarantee silence, drain the queue before disconnecting:

```ts
observer.takeRecords(); // discard pending records
observer.disconnect(); // now safe — nothing left to deliver
```

You can also call `takeRecords()` after `disconnect()` to synchronously retrieve pending records for processing rather than discarding them.

**disconnect() does not uninstall hooks.** The hooks MutationObserver installed on the Window remain in place. This is deliberate — the hook chain is a singly-linked list of closures. You can't remove a link from the middle without breaking everything after it. Removing MutationObserver's link would sever the chain for every consumer installed before it. So hooks remain installed for the lifetime of the Window.

This means a Window that has had at least one MutationObserver carries a small overhead: the hook functions still fire for every mutation, iterate the observer set, and find it empty — so the cost is minimal, but it exists. The trade-off is correctness over cleanup: a small per-mutation cost versus the risk of silently breaking the hook chain.

## Behavioral notes

These behaviors are consistent with MutationObserver's design but can surprise developers who haven't encountered them before.

### Deduplication is inconsistent

Setting an attribute to its current value does **not** produce a record — `setAttribute` is deduplicated. But assigning a text node's `data` to its current value **does** produce a record — `characterData` changes have no deduplication.

```ts
element.setAttribute('id', 'x');
element.setAttribute('id', 'x');
// One record — the second setAttribute is a no-op.

text.data = 'hello';
text.data = 'hello';
// Two records — both assignments fire.
```

If your callback needs to skip no-op text changes, compare against the `oldValue` (requires `characterDataOldValue: true`).

### DocumentFragment insertion expands per child

When a `DocumentFragment` is appended to an element, each child is inserted individually. The observer receives one `childList` record per child — not a single record for the fragment.

### Detached subtrees leave observation

Subtree observation walks the `parentNode` chain from the mutation target upward. Once a node is removed from the observed subtree, its `parentNode` is set to `null`, and subsequent mutations inside the detached subtree no longer match the ancestor observation.

```ts
observer.observe(container, {attributes: true, childList: true, subtree: true});
const child = container.firstChild;
container.removeChild(child);
child.setAttribute('data-x', 'y');
// The removal produces a childList record.
// The setAttribute does NOT — child is no longer in container's subtree.
```

### Overlapping observations produce duplicate records

If an observer watches both a parent (with `subtree: true`) and a child directly, a single mutation on the child matches both observations. The callback receives two records for the same mutation — one per matching observation.

## How MutationObserver wires into the hooks bridge

MutationObserver doesn't observe the DOM directly. It's layered on top of the [hooks bridge](./hooks-bridge.md) — the same mechanism renderers use. Understanding this layering clarifies both why MutationObserver works and how it can break.

### One installation per Window

The first `observe()` call on a Window installs hook functions for five mutation types: `setAttribute`, `removeAttribute`, `setText`, `insertChild`, and `removeChild`. A per-Window store tracks whether installation has happened. Subsequent `observe()` calls — from the same or different observers — skip installation.

```
First observe() call on a Window:
  1. Check store.installed → false
  2. Capture previous hook functions in closures
  3. Write new functions to the hook slots
  4. Set store.installed = true

All later observe() calls:
  1. Check store.installed → true
  2. Skip installation
```

All observers on a Window share a single hook installation. The hooks don't know how many observers exist. They fire `notifyMutationObservers()`, which iterates the store's observer set and calls `enqueue()` on each.

This one-installation design keeps the hook chain short. If every observer installed its own hooks, a Window with ten observers would add ten links to every hook chain — ten function calls per mutation, even though the work is identical. A single installation multiplexes to all observers with one hook call per mutation type.

### The chain after installation

MutationObserver follows the [chaining contract](./hooks-bridge.md#the-chaining-contract): it saves the previous hook function and calls it **first**, before processing the mutation. The full sequence for each mutation is:

1. The DOM operation completes (attribute is set, child is inserted, text is updated).
2. The previous hook runs (renderer, other consumer, or nothing).
3. MutationObserver enqueues the record for matching observers.
4. Eventually, the microtask fires and delivers the batch.

```
setAttribute slot after MutationObserver installs:

  ┌────────────────────┐       ┌──────────────────────┐
  │  MO's hook         │──────▶│  Previous hook        │──────▶ undefined
  │  (in the slot)     │ calls │  (renderer, etc.)     │ calls
  │                    │ first │                       │ first
  └────────────────────┘       └──────────────────────┘
         │
         ▼
  notifyMutationObservers()
         │
    ┌────┴────┐
    ▼         ▼
 Observer  Observer
    A         B
```

This ordering means renderer hooks always execute before observer notification — a design choice that keeps synchronous rendering and asynchronous observation in the right sequence.

### What MutationObserver does NOT hook

MutationObserver hooks five mutation types. It does not hook:

- `createElement` / `createText` — node creation isn't a mutation on an existing node.
- `addEventListener` / `removeEventListener` — event listener changes aren't DOM mutations.
- `focusChange` / `hoverChange` — state transitions, not structural mutations.

If you need to observe node creation or focus changes, use the hooks bridge directly.

## The silent break — when the chain fails

This is the most common source of bugs when working with MutationObserver. If you only use MutationObserver and don't install hooks yourself, this section is still worth reading — because a library or renderer in your dependency tree might.

### What happens

The hooks bridge uses a [slot-and-chain model](./hooks-bridge.md#how-hooks-work--the-slot-and-chain-model). MutationObserver writes its functions into the hook slots. If any code overwrites those slots afterward without chaining, MutationObserver's hooks are disconnected from the slot — mutations no longer reach the observers.

```
Before — MO is in the chain:

  setAttribute slot ──▶ MO's hook ──▶ previous ──▶ ...


After — someone overwrites the slot without chaining:

  setAttribute slot ──▶ New hook ──▶ undefined

  MO's hook (orphaned, nothing calls it)
```

MutationObserver silently stops working. No error. No record delivery. The observers are still registered, `disconnect()` still works, but no mutations arrive.

### The rule

**If you install hooks after MutationObserver has called `observe()`, you must chain.** Save the current slot contents and call them in your hook function. This is the same [chaining contract](./hooks-bridge.md#the-chaining-contract) that all hooks consumers must follow — MutationObserver is just the most common victim when it's violated, because it's the consumer most application code depends on.

```ts
import {HOOKS} from '@cliui/dom';

// ✘ Breaks MutationObserver (and anything else in the chain)
window[HOOKS].setAttribute = (element, name, value) => {
  myCustomHandler(element, name, value);
};

// ✔ Preserves the chain
const previous = window[HOOKS].setAttribute;
window[HOOKS].setAttribute = (element, name, value, ns, oldValue) => {
  previous?.(element, name, value, ns, oldValue);
  myCustomHandler(element, name, value);
};
```

### Why this bug is hard to find

Breaking the chain produces no error and no exception. MutationObserver simply goes quiet. The cause is a missing two lines of code — saving and calling the previous function — in a file that may have nothing to do with the observer that stopped working. The symptoms appear in the observer; the bug lives in the code that installed hooks.

If your MutationObserver stops delivering records:

1. Check whether any code installs hooks on the same Window.
2. Verify that each installation saves and calls the previous function.
3. Check the installation order — hooks installed _before_ MutationObserver's `observe()` call are safe (MutationObserver wraps them). Hooks installed _after_ must chain to preserve MutationObserver.

## Choosing between MutationObserver and hooks

The choice comes down to timing and audience. Renderer code that must stay in lockstep with every individual mutation — updating a scene graph, diffing a terminal buffer — should use hooks directly. Application code that reacts to DOM changes at a higher level — tracking mutations for undo history, syncing external state, observing dynamic content — should reach for MutationObserver.

| Need                                       | Use              |
| ------------------------------------------ | ---------------- |
| Synchronous notification per mutation      | Hooks            |
| Batched notification after a burst         | MutationObserver |
| Filtered observation (specific attributes) | MutationObserver |
| Subtree observation                        | MutationObserver |
| Node creation observation                  | Hooks            |
| Focus/hover state changes                  | Hooks            |
| Renderer integration                       | Hooks            |
| Application-level change tracking          | MutationObserver |

## Where to go next

- **[The Hooks Bridge](./hooks-bridge.md)** — the foundation MutationObserver is built on
- **[Scope and Boundaries](./scope-and-boundaries.md)** — what @cliui/dom implements and what it doesn't
