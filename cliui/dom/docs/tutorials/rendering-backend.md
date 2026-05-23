# Building a Rendering Backend — From Hooks to Text Output

This tutorial builds a toy rendering backend that observes DOM mutations through the [hooks bridge](../learn/hooks-bridge.md) and converts the live tree into indented text output. The DOM is the state layer — it stores the tree, attributes, styles, and text. This tutorial builds the rendering layer: the code that reads that state and produces output. If you've completed the [framework integration tutorial](./framework-integration.md), you've already seen a framework producing DOM mutations — this tutorial builds the other side: a renderer that observes them. You'll install hooks, handle the initial tree, render on every change, react to style mutations, and see how your renderer coexists with MutationObserver.

Each code block below is a complete `main.mjs` file. Replace the previous contents each time, then run with `node main.mjs`.

## Prerequisites

- Completed the [Getting Started](./getting-started.md) tutorial
- Node.js 18 or later
- `@cliui/dom` installed (`npm install @cliui/dom`)

## Access the hooks object

The `HOOKS` symbol is the key to observing DOM mutations. Import it from `@cliui/dom` — never create your own `Symbol('hooks')`, because each `Symbol()` call produces a unique value and yours won't match.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const hooks = window[HOOKS];

console.log(typeof hooks);
console.log(Object.keys(hooks).length);
```

Run it:

```
object
0
```

`window[HOOKS]` is a plain empty object. You observe mutations by writing functions to its properties.

## Install logging hooks

Install hooks for the mutation types a renderer cares about and build some DOM to see them fire.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;
const hooks = window[HOOKS];

hooks.createElement = (element) => {
  console.log(`create   <${element.localName}>`);
};
hooks.insertChild = (parent, child, index) => {
  const tag = child.nodeType === 1 ? `<${child.localName}>` : `"${child.data}"`;
  console.log(`insert   ${tag} → <${parent.localName}>[${index}]`);
};
hooks.removeChild = (parent, child, index) => {
  const tag = child.nodeType === 1 ? `<${child.localName}>` : `"${child.data}"`;
  console.log(`remove   ${tag} ← <${parent.localName}>[${index}]`);
};
hooks.setAttribute = (element, name, value) => {
  console.log(`setAttr  <${element.localName}> ${name}="${value}"`);
};
hooks.setText = (text, data) => {
  console.log(`setText  "${data}"`);
};

const header = document.createElement('header');
const h1 = document.createElement('h1');
h1.textContent = 'My App';
header.appendChild(h1);

const main = document.createElement('main');
main.setAttribute('class', 'content');
const p = document.createElement('p');
p.textContent = 'Welcome.';
main.appendChild(p);

document.body.appendChild(header);
document.body.appendChild(main);

console.log('---');
p.textContent = 'Updated.';
```

Run it:

```
create   <header>
create   <h1>
insert   "My App" → <h1>[0]
insert   <h1> → <header>[0]
create   <main>
setAttr  <main> class="content"
create   <p>
insert   "Welcome." → <p>[0]
insert   <p> → <main>[0]
insert   <header> → <body>[0]
insert   <main> → <body>[1]
---
setText  "Updated."
```

Every mutation fires its hook synchronously — inside the mutation's call stack, after the DOM state has changed. The final `setText` demonstrates a subtlety: setting `textContent` on an element with a single text child updates that node's data directly rather than removing and reinserting.

## Walk the existing tree

`new Window()` constructs `<html>`, `<head>`, and `<body>` during construction — before you can install hooks. Content added before installation is invisible to hooks.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;

// Content added BEFORE hooks are installed
document.body.innerHTML = '<div id="app">Hello</div>';

// Install a hook
const hooks = window[HOOKS];
hooks.insertChild = (parent, child) => {
  const tag = child.nodeType === 1 ? `<${child.localName}>` : `"${child.data}"`;
  console.log(`hook: insert ${tag}`);
};

// Hooks didn't fire for existing content. Walk the tree to discover it.
function walk(node, depth = 0) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    const indent = '  '.repeat(depth);
    if (child.nodeType === 1) {
      console.log(`${indent}found <${child.localName}>`);
      walk(child, depth + 1);
    } else if (child.nodeType === 3) {
      console.log(`${indent}found "${child.data}"`);
    }
  }
}

console.log('Existing tree:');
walk(document.body);

console.log('\nNew mutation:');
document.querySelector('#app').appendChild(document.createElement('span'));
```

Run it:

```
Existing tree:
found <div>
  found "Hello"

New mutation:
hook: insert <span>
```

The walk discovers nodes that hooks missed. A real renderer walks the existing tree once at startup, then uses hooks for incremental updates. This is the shape of every rendering backend: **walk once, then chain** — the tree walk gives you the initial state, the hooks keep you synchronized.

## Build a text renderer

Combine tree walking with hooks to print the DOM as indented text after every mutation. A real renderer would maintain incremental state. We re-render the full tree each time to keep things simple.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;

function renderNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  if (node.nodeType === 1) {
    let attrs = '';
    for (const attr of node.attributes) {
      attrs += ` ${attr.name}="${attr.value}"`;
    }
    let out = `${indent}<${node.localName}${attrs}>\n`;
    for (let i = 0; i < node.childNodes.length; i++) {
      out += renderNode(node.childNodes[i], depth + 1);
    }
    return out;
  }
  if (node.nodeType === 3 && node.data.trim()) {
    return `${indent}"${node.data}"\n`;
  }
  return '';
}

function render() {
  console.log('--- render ---');
  process.stdout.write(renderNode(document.body));
}

const hooks = window[HOOKS];
hooks.insertChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.removeChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.setAttribute = (el) => {
  if (el.isConnected) render();
};
hooks.removeAttribute = (el) => {
  if (el.isConnected) render();
};
hooks.setText = (t) => {
  if (t.parentNode?.isConnected) render();
};

// Initial render (walks existing tree)
render();

// Mutate the DOM
const div = document.createElement('div');
div.setAttribute('id', 'app');
document.body.appendChild(div);

const h1 = document.createElement('h1');
h1.textContent = 'Hello';
document.querySelector('#app').appendChild(h1);

h1.textContent = 'Hello, world';

document.querySelector('#app').removeAttribute('id');
```

Run it:

```
--- render ---
<body>
--- render ---
<body>
  <div id="app">
--- render ---
<body>
  <div id="app">
    <h1>
      "Hello"
--- render ---
<body>
  <div id="app">
    <h1>
      "Hello, world"
--- render ---
<body>
  <div>
    <h1>
      "Hello, world"
```

Five renders: the initial render (empty body), `insertChild` for the div into body, `insertChild` for h1 into the div, `setText` for the text update, and `removeAttribute` removing the id. The `isConnected` guards prevent spurious renders — `setAttribute('id', 'app')` on the detached div and `insertChild` for the text node into the detached h1 are both skipped.

This renderer handles tree mutations, attributes, and text. A full interaction backend would also install `createElement` and `createText` to allocate backing resources at creation time, `addEventListener` and `removeEventListener` to know which events the application cares about, and `focusChange` and `hoverChange` to track state transitions. The [Hooks interface](../learn/hooks-bridge.md) defines all eleven callbacks.

## Handle style changes

When you set `element.style.color = 'red'`, the hooks bridge reports it as `setAttribute(element, 'style', cssText)` — the full serialized style string. There is no separate style hook. But this is a hook-level notification only — `element.getAttribute('style')` is not updated. Styles set via `element.style` live in a separate store, which is why our `renderNode` function reads `node.style.cssText` directly rather than relying on the attribute iterator.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;

function renderNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  if (node.nodeType === 1) {
    let attrs = '';
    for (const attr of node.attributes) {
      attrs += ` ${attr.name}="${attr.value}"`;
    }
    const style = node.style.cssText;
    if (style) attrs += ` style="${style}"`;
    let out = `${indent}<${node.localName}${attrs}>\n`;
    for (let i = 0; i < node.childNodes.length; i++) {
      out += renderNode(node.childNodes[i], depth + 1);
    }
    return out;
  }
  if (node.nodeType === 3 && node.data.trim()) {
    return `${indent}"${node.data}"\n`;
  }
  return '';
}

function render() {
  console.log('--- render ---');
  process.stdout.write(renderNode(document.body));
}

const hooks = window[HOOKS];
hooks.insertChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.removeChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.setAttribute = (el, name, value) => {
  if (name === 'style') console.log(`style: ${value}`);
  if (el.isConnected) render();
};
hooks.removeAttribute = (el) => {
  if (el.isConnected) render();
};
hooks.setText = (t) => {
  if (t.parentNode?.isConnected) render();
};

const div = document.createElement('div');
div.textContent = 'Styled';
document.body.appendChild(div);

div.style.color = 'red';
div.style.fontWeight = 'bold';
```

Run it:

```
--- render ---
<body>
  <div>
    "Styled"
style: color: red
--- render ---
<body>
  <div style="color: red">
    "Styled"
style: color: red; font-weight: bold
--- render ---
<body>
  <div style="color: red; font-weight: bold">
    "Styled"
```

Each style property assignment fires `setAttribute` with `'style'` as the name and the full `cssText` as the value. If your renderer needs individual property changes, it must parse the cssText or maintain its own tracking. Not all `setAttribute` notifications include `oldValue` — the [hooks bridge](../learn/hooks-bridge.md) covers the full details.

## Add MutationObserver alongside the renderer

MutationObserver is built on top of hooks — it installs its own hook functions using the same chaining pattern. Both systems receive every mutation: hooks fire synchronously, MutationObserver delivers batched records in the next microtask.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;

function renderNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  if (node.nodeType === 1) {
    let attrs = '';
    for (const attr of node.attributes) {
      attrs += ` ${attr.name}="${attr.value}"`;
    }
    let out = `${indent}<${node.localName}${attrs}>\n`;
    for (let i = 0; i < node.childNodes.length; i++) {
      out += renderNode(node.childNodes[i], depth + 1);
    }
    return out;
  }
  if (node.nodeType === 3 && node.data.trim()) {
    return `${indent}"${node.data}"\n`;
  }
  return '';
}

function render() {
  console.log('--- render ---');
  process.stdout.write(renderNode(document.body));
}

// Renderer hooks first
const hooks = window[HOOKS];
hooks.insertChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.removeChild = (parent) => {
  if (parent.isConnected) render();
};
hooks.setAttribute = (el) => {
  if (el.isConnected) render();
};
hooks.removeAttribute = (el) => {
  if (el.isConnected) render();
};
hooks.setText = (t) => {
  if (t.parentNode?.isConnected) render();
};

// MutationObserver chains on top — saves our hooks, installs its own,
// calls ours inside. Both systems coexist.
const observer = new window.MutationObserver((records) => {
  console.log(`observer: ${records.length} record(s)`);
  for (const r of records) console.log(`  ${r.type}: ${r.target.nodeName}`);
});
observer.observe(document.body, {childList: true, subtree: true, attributes: true});

const p = document.createElement('p');
p.textContent = 'Both systems see this.';
document.body.appendChild(p);

queueMicrotask(() => console.log('(microtask boundary)'));
```

Run it:

```
--- render ---
<body>
  <p>
    "Both systems see this."
observer: 1 record(s)
  childList: BODY
(microtask boundary)
```

The renderer fires synchronously during `appendChild`. The MutationObserver callback fires in the next microtask. Both received the same insertion — different timing models, same underlying hooks.

## The anti-pattern: breaking the chain

The hooks bridge relies on a discipline: save the previous function, install yours, call the previous inside. Skip this and every downstream consumer goes silent. No error. No warning.

```js
import {Window, HOOKS} from '@cliui/dom';

const window = new Window();
const document = window.document;
const hooks = window[HOOKS];

// Set up MutationObserver (installs its own chained hooks)
const observer = new window.MutationObserver((records) => {
  console.log(`observer: ${records.length} record(s)`);
});
observer.observe(document.body, {childList: true, subtree: true});

// Add a renderer WITH proper chaining
const previousInsert = hooks.insertChild;
hooks.insertChild = (parent, child, index) => {
  previousInsert?.(parent, child, index);
  console.log(`renderer: inserted <${child.nodeType === 1 ? child.localName : 'text'}>`);
};

// Both work
document.body.appendChild(document.createElement('div'));
await new Promise((r) => queueMicrotask(r));
console.log('---');

// A careless consumer overwrites WITHOUT chaining
hooks.insertChild = (parent, child) => {
  console.log(`careless: inserted something`);
};

// Only the careless consumer fires — renderer and observer are dead
document.body.appendChild(document.createElement('span'));
await new Promise((r) => queueMicrotask(r));
console.log('---');

// Fix it by chaining from the current occupant forward
const previousInsert2 = hooks.insertChild;
hooks.insertChild = (parent, child, index) => {
  previousInsert2?.(parent, child, index);
  console.log(`fixed: inserted <${child.nodeType === 1 ? child.localName : 'text'}>`);
};

document.body.appendChild(document.createElement('em'));
await new Promise((r) => queueMicrotask(r));
```

Run it:

```
renderer: inserted <div>
observer: 1 record(s)
---
careless: inserted something
---
careless: inserted something
fixed: inserted <em>
```

After the careless overwrite, both the renderer and MutationObserver go silent — the observer never delivers a record for the `<span>`. Chaining from the current occupant restores propagation through the careless consumer, but the original renderer is permanently lost.

**Always save the previous function. Always call it with `?.()`.**

## What you've learned

- `window[HOOKS]` is a plain object where you install mutation callbacks — import `HOOKS` from `@cliui/dom`, never create your own Symbol
- Hooks fire synchronously, inside the mutation's call stack, after the DOM state has changed
- `new Window()` creates `<html>`, `<head>`, `<body>` before hooks can be installed — walk the existing tree to initialize renderer state
- A renderer needs at least five hooks: `insertChild`, `removeChild`, `setAttribute`, `removeAttribute`, and `setText` — the full [Hooks interface](../learn/hooks-bridge.md) defines eleven callbacks, including `createElement`, `createText`, and state transition hooks that a complete rendering backend would also use
- Style changes arrive as `setAttribute(element, 'style', cssText)` — no separate style hook
- MutationObserver is built on top of hooks using the same chaining pattern — both systems coexist
- The chaining contract — save previous, call with `?.()` — is the discipline that makes coexistence work; breaking it silently kills downstream consumers

## What's next

- **[The Hooks Bridge](../learn/hooks-bridge.md)** — all eleven hooks, timing guarantees, argument variability, and the slot-and-chain model in depth
- **[MutationObserver](../learn/mutation-observer.md)** — batching, filtering, subtree observation, and how it layers on hooks
- **[CSSStyleDeclaration](../learn/css-style-declaration.md)** — the style/attribute boundary and how style changes flow through hooks
- **[What Is @cliui/dom?](../learn/what-is-cliui-dom.md)** — the two-layer architecture and why the DOM is just a state container
