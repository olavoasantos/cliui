# Observe DOM Mutations with MutationObserver

Watch child list changes, attribute mutations, text updates, and deep subtrees — then retrieve or tear down.

Every example starts from a Window and Document:

```ts
import {Window, MutationObserver} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

> **The sharp edge:** mutations happen synchronously, but observer callbacks fire later — batched per microtask. Two `appendChild` calls in a row produce two records, but your callback sees them together in one invocation. If you need synchronous per-mutation notifications, use the [hooks bridge](../learn/hooks-bridge.md) instead.

## Create an observer

```ts
const observer = new MutationObserver((records, observer) => {
  for (const record of records) {
    console.log(record.type, record.target);
  }
});
```

## Observe child list mutations

```ts
const container = document.createElement('div');
document.body.appendChild(container);

observer.observe(container, {childList: true});
```

```ts
const a = document.createElement('span');
const b = document.createElement('span');

// Both mutations happen synchronously...
container.appendChild(a);
container.appendChild(b);
// ...but the callback hasn't fired yet.

await Promise.resolve();
// NOW the callback fires — once — with both records:
//   records[0].type === 'childList', records[0].addedNodes → [a]
//   records[1].type === 'childList', records[1].addedNodes → [b]
```

## Observe attribute changes

```ts
observer.observe(element, {attributes: true});

element.setAttribute('class', 'active');
element.setAttribute('id', 'main');
```

After the microtask, the callback receives two records with `type: 'attributes'` and an `attributeName` field.

### Filter to specific attributes

```ts
observer.observe(element, {
  attributes: true,
  attributeFilter: ['class', 'data-state'],
});

element.setAttribute('class', 'active'); // → produces a record
element.setAttribute('id', 'main'); // → ignored
element.setAttribute('data-state', 'open'); // → produces a record
```

## Track old values

```ts
observer.observe(element, {attributeOldValue: true});

element.setAttribute('class', 'before');
element.setAttribute('class', 'after');

await Promise.resolve();
// records[0].oldValue → null      (no previous value)
// records[1].oldValue → 'before'  (captured before the second set)
```

Setting `attributeOldValue: true` implies `attributes: true`. The same applies to `characterDataOldValue: true` implying `characterData: true`.

For text nodes:

```ts
const text = document.createTextNode('hello');
container.appendChild(text);

observer.observe(text, {characterDataOldValue: true});

text.data = 'world';

await Promise.resolve();
// record.type === 'characterData'
// record.oldValue === 'hello'
```

## Observe deep subtrees

Set `subtree: true` to observe all descendants, not just the target:

```ts
observer.observe(container, {
  childList: true,
  attributes: true,
  subtree: true,
});

const child = document.createElement('div');
container.appendChild(child);

const grandchild = document.createElement('span');
child.appendChild(grandchild);

grandchild.setAttribute('class', 'deep');
```

All three mutations produce records. Without `subtree`, only the direct child insertion would match.

Once a node is removed from the observed subtree, its mutations stop matching:

```ts
container.removeChild(child);
child.setAttribute('data-x', 'y');
// The removal produces a childList record.
// The setAttribute does NOT — child is no longer in container's subtree.
```

## Retrieve records synchronously

`takeRecords()` drains the pending queue immediately. Those records won't reach the callback.

```ts
element.setAttribute('class', 'a');
element.setAttribute('id', 'b');

const records = observer.takeRecords();
// records.length === 2
```

## Disconnect the observer

```ts
observer.disconnect();
```

If mutations were enqueued before `disconnect()`, the callback may still fire. To guarantee silence, drain first:

```ts
observer.takeRecords();
observer.disconnect();
```

## Use multiple observers on the same node

Different observer instances can watch the same target with different options:

```ts
element.setAttribute('class', 'red');

const observerA = new MutationObserver((records) => {
  console.log('A:', records[0].oldValue); // 'red'
});

const observerB = new MutationObserver((records) => {
  console.log('B:', records[0].oldValue); // null
});

observerA.observe(element, {attributeOldValue: true});
observerB.observe(element, {attributes: true});

element.setAttribute('class', 'blue');
```

Calling `observe()` on a target you're already watching replaces the options — it doesn't merge them:

```ts
observer.observe(element, {attributes: true, childList: true});
observer.observe(element, {attributes: true});
// Now only watching attributes. childList observation is gone.
```

## Where to go next

- **[MutationObserver — Behavior and Invariants](../learn/mutation-observer.md)** — if you need to understand why records arrive in a batch instead of one-at-a-time, this covers the full queuing and delivery model
- **[The Hooks Bridge](../learn/hooks-bridge.md)** — if you need synchronous per-mutation notifications instead of batched records — for a renderer that must stay in lockstep — this is the alternative API
