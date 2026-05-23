# Move Nodes Between Documents

Clone, copy, or transfer DOM nodes across documents.

Every example starts from two documents:

```ts
import {Window} from '@cliui/dom';

const windowA = new Window();
const docA = windowA.document;

const windowB = new Window();
const docB = windowB.document;
```

## Choose the right operation

| Goal                          | Operation                          | Creates copy? | Changes owner? | Removes from parent? | Preserves listeners? |
| ----------------------------- | ---------------------------------- | ------------- | -------------- | -------------------- | -------------------- |
| Duplicate within one document | `node.cloneNode(deep)`             | Yes           | No             | No                   | No                   |
| Copy into another document    | `targetDoc.importNode(node, deep)` | Yes           | Yes            | No                   | No                   |
| Move to another document      | `targetDoc.adoptNode(node)`        | No            | Yes            | Yes                  | Yes                  |

## Clone within the same document

`node.cloneNode()` creates a copy owned by the same document. Pass `true` for a deep clone:

```ts
const item = docA.createElement('li');
item.setAttribute('class', 'active');
item.appendChild(docA.createTextNode('Home'));

// Shallow — element + attributes, no children
const shallow = item.cloneNode(false);
shallow.getAttribute('class'); // 'active'
shallow.childNodes.length; // 0

// Deep — element + attributes + all descendants
const deep = item.cloneNode(true);
deep !== item; // true — new object
deep.getAttribute('class'); // 'active' — attributes are copied
deep.textContent; // 'Home'
```

> **Checkpoint.** The clone is a distinct object (`!==`) with copies of all attributes and descendants. It is detached — append it wherever you need it.

## Copy into a different document

`targetDoc.importNode(node, deep?)` works like `cloneNode`, but the copy is owned by the target document:

```ts
const card = docA.createElement('div');
card.setAttribute('role', 'article');
card.appendChild(docA.createTextNode('Content'));

const imported = docB.importNode(card, true);
imported.textContent; // 'Content'
imported.ownerDocument === docB; // true
imported.childNodes[0].ownerDocument === docB; // true
```

The original stays untouched in `docA`.

## Transfer ownership without copying

`targetDoc.adoptNode(node)` moves an existing node — no copy is created. The node is removed from its current parent and its `ownerDocument` changes:

```ts
const banner = docA.createElement('header');
banner.setAttribute('id', 'main-banner');
banner.appendChild(docA.createTextNode('Welcome'));
docA.body.appendChild(banner);

const adopted = docB.adoptNode(banner);

adopted === banner; // true — same object
adopted.ownerDocument === docB; // true
adopted.parentNode; // null — removed from docA.body
adopted.childNodes[0].ownerDocument === docB; // true
docA.body.childNodes.length; // 0
```

> **Checkpoint.** `adopted === banner` confirms no copy was made. `ownerDocument === docB` confirms the transfer. The node and all descendants now belong to the new document.

If the node is already owned by the target document, `adoptNode` returns it unchanged.

## Do listeners transfer?

`cloneNode` and `importNode` create new objects — listeners are **not** copied. Re-register them on the clone:

```ts
const button = docA.createElement('button');
button.addEventListener('click', () => {
  /* handler */
});

const cloned = button.cloneNode(true);
// cloned has no 'click' listener — register it again
cloned.addEventListener('click', () => {
  /* handler */
});
```

> **Sharp edge.** `cloneNode` and `importNode` create new objects — listeners are gone. `adoptNode` moves the same object — listeners survive. This is the critical distinction when choosing between copy and transfer.

`adoptNode` moves the same object, so all listeners survive:

```ts
const input = docA.createElement('input');
let focused = false;
input.addEventListener('focus', () => {
  focused = true;
});

const adopted = docB.adoptNode(input);
adopted.dispatchEvent(new Event('focus'));
focused; // true — listener survived the transfer
```

> **Checkpoint.** Dispatching an event on the adopted node fires the original listener, confirming it survived the document transfer.

## Handle custom elements during clone

`cloneNode` and `importNode` call `createElement(localName)` on the target document, which checks that document's custom element registry. If the class is registered, the clone uses it. If not, the clone is a plain `Element`:

```ts
class MyCard extends windowA.HTMLElement {}
windowA.customElements.define('my-card', MyCard);

const card = docA.createElement('my-card');

// Clone within docA — registry has 'my-card'
card.cloneNode(true) instanceof MyCard; // true

// Import into docB — registry does NOT have 'my-card'
docB.importNode(card, true) instanceof MyCard; // false
```

## Watch for adoptNode side effects

If the adopted node is connected, `adoptNode` calls `removeChild` on the old parent first. For custom elements, this triggers `disconnectedCallback` before the ownership transfer:

```ts
const widget = docA.createElement('my-widget');
docA.body.appendChild(widget);

// Adopting removes widget from docA.body, firing disconnectedCallback
const adopted = docB.adoptNode(widget);
adopted.parentNode; // null
```

## Where to go next

- **[DOM Architecture and Class Hierarchy](../learn/dom-architecture.md)** — for how node ownership, the linked-list tree structure, and the `ownerDocument` relationship work
- **[Getting Started](../tutorials/getting-started.md)** — for creating Windows, Documents, and building DOM trees from scratch
