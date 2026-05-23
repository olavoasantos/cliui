# Handle Focus and Keyboard Navigation

Make elements focusable, move focus between them, and respond to focus transitions.

Every example starts from a Window and Document:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

## Make elements focusable

Set a `tabindex` attribute. No `tabindex`, no focus — the element is invisible to the focus system:

```ts
const button = document.createElement('div');
button.setAttribute('tabindex', '0');
document.body.appendChild(button);

const input = document.createElement('div');
input.setAttribute('tabindex', '0');
document.body.appendChild(input);
```

At this point, verify your elements are registered:

```ts
document.querySelectorAll('[tabindex]').length; // → 2
```

There are no "naturally focusable" elements — `<button>` and `<input>` don't get special treatment. The one exception is `HTMLAnchorElement`: setting `href` auto-sets `tabindex="0"`.

## Set focus programmatically

`document.setActiveElement(element)` moves focus to a specific element. Pass `null` to reset focus to `document.body`:

```ts
const panel = document.createElement('div');
panel.setAttribute('tabindex', '0');
document.body.appendChild(panel);

document.setActiveElement(panel);
document.activeElement === panel; // → true

document.setActiveElement(null);
document.activeElement; // → <body>
```

`setActiveElement` works on any element, even without `tabindex`. The `tabindex` restriction only applies to `focusNext()`.

> Setting focus to the element that already has focus is a no-op — no events fire, no hooks run. `activeElement` never returns `null`; it defaults to `document.body`.

## Cycle focus forward

`document.focusNext()` moves focus to the next focusable element in document order. The cycle wraps after the last element:

```ts
document.body.innerHTML = `
  <div tabindex="0" id="a">A</div>
  <div tabindex="0" id="b">B</div>
  <div tabindex="0" id="c">C</div>
`;

document.focusNext(); // → #a
document.focusNext(); // → #b
document.focusNext(); // → #c
document.focusNext(); // → #a (wraps around)
```

If no focusable elements exist, `focusNext()` focuses `document.body`.

> `focusNext()` uses document order, not `tabindex` value order. The _value_ of `tabindex` is ignored for ordering. Unlike browsers, `tabindex="-1"` elements are included in the cycle — any element with a `tabindex` attribute participates.

> **If you're coming from browser DOM, this will surprise you.** In browsers, `tabindex="-1"` means "focusable programmatically but excluded from Tab cycling." In terminal-dom, every element with a `tabindex` attribute — including `"-1"` — participates in `focusNext()`. If you need to exclude an element from the cycle, remove the attribute entirely with `element.removeAttribute('tabindex')`. This is the single biggest behavioral divergence from browser focus semantics.

## Cycle focus backward

Pass `true` to `focusNext` to reverse direction:

```ts
document.setActiveElement(document.querySelector('#a'));

document.focusNext(true); // → #c (wraps to end)
document.focusNext(true); // → #b
```

## Listen for focus transitions

Focus changes dispatch four events. Two fire on the element losing focus, two on the element gaining it:

```ts
const a = document.querySelector('#a')!;
const b = document.querySelector('#b')!;

document.setActiveElement(a);
document.setActiveElement(b);
// blur on a → focusout on a → focus on b → focusin on b
```

`blur` and `focus` do **not** bubble. `focusout` and `focusin` **do** bubble. If you're listening on a container to catch focus changes from any descendant, use `focusin` and `focusout`:

```ts
container.addEventListener('focusin', (event) => {
  console.log('focus entered:', event.target.localName);
});

container.addEventListener('focusout', (event) => {
  console.log('focus left:', event.target.localName);
});
```

All four events carry a `relatedTarget` — on `blur`/`focusout`, it's the element gaining focus; on `focus`/`focusin`, it's the element that lost it.

## Where to go next

- **[Event Propagation Model](../learn/event-propagation.md)** — for how focus events propagate through the tree: which bubble, which don't, and the `relatedTarget` contract
- **[Use HTMLDialogElement for Modals](./dialog-modals.md)** — focus trapping inside modal dialogs
- **[The Hooks Bridge](../learn/hooks-bridge.md)** — the `focusChange` and `hoverChange` hooks for renderer integration
- **[Query the DOM](./query-selectors.md)** — `:focus` and `:hover` pseudo-class selectors
