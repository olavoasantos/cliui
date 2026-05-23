# Framework Integration — Preact on @cliui/dom

In this tutorial, we'll run a Preact application on @cliui/dom in Node.js — no browser, no build tools. The core insight: frameworks are DOM API consumers, and @cliui/dom provides enough of the DOM surface for them to work unmodified. The framework produces mutations; a renderer observes them; the [hooks bridge](../learn/hooks-bridge.md) connects the two. We'll prove this by polyfilling the environment, rendering a Preact component, watching the hooks fire, and confirming that reconciliation works. In the [rendering backend tutorial](./rendering-backend.md), you'll build the other side — a renderer that observes these same mutations.

> In a real terminal application, `@cliui/terminal` handles polyfilling automatically on import. This tutorial shows the manual approach so you understand what's happening underneath.

Each code block below is a complete `main.mjs` file. Replace the previous contents each time, then run with `node main.mjs`.

## Prerequisites

- Completed the [Getting Started](./getting-started.md) tutorial
- Node.js 18 or later
- A package manager (`npm`, `pnpm`, or `yarn`)
- Basic familiarity with Preact or React

> The examples are written in JavaScript. If you prefer TypeScript, name the file `main.ts` and run it with `tsx`.

## Install @cliui/dom and Preact

Create a project folder and install both packages:

```bash
mkdir preact-dom && cd preact-dom
npm init -y
npm install @cliui/dom preact @preact/signals
```

Create a file called `main.mjs`:

```bash
touch main.mjs
```

## Polyfill the environment

Frameworks like Preact expect browser globals — `document`, `window`, `Event`, `Node`, and dozens more. `polyfillEnvironment` installs them onto `globalThis` from a `Window` instance, so frameworks work without modification.

Add the following to `main.mjs`:

```js
import {Window, polyfillEnvironment} from '@cliui/dom';

polyfillEnvironment(new Window());

console.log(document.body.outerHTML);
```

Run it:

```bash
node main.mjs
```

You should see:

```
<body></body>
```

One function call, and the core DOM surface — `document`, `window`, `Element`, `Node`, `Event`, `MutationObserver`, and the other class constructors that `Window` exposes — now exists on `globalThis`. Frameworks that reference these globals will find them exactly where they expect.

> `polyfillEnvironment` installs DOM globals like `document`, `window`, and `Event` onto `globalThis`. It does **not** install `requestAnimationFrame` or `matchMedia` — if your framework needs these, keep a reference to the `Window` instance (`const win = new Window()`) and bind: `globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win)`.

This is irreversible in practice — call it once, at startup, before importing any framework code.

## Render a Preact component

Now let's render a Preact component into the polyfilled DOM:

```js
import {Window, polyfillEnvironment} from '@cliui/dom';
polyfillEnvironment(new Window());

const {h, render} = await import('preact');

function App() {
  return h(
    'div',
    {class: 'app'},
    h('h1', null, 'Hello from Preact'),
    h('p', null, 'Running on @cliui/dom'),
  );
}

render(h(App, null), document.body);

console.log(document.body.innerHTML);
```

Run it. You should see:

```
<div class="app"><h1>Hello from Preact</h1><p>Running on @cliui/dom</p></div>
```

We use dynamic `import()` so the polyfill is installed before Preact loads — some libraries cache global references at import time. Preact's `h()` function creates virtual DOM nodes — it's what JSX compiles to. We use it directly to avoid needing a build step. `render()` takes the virtual tree and produces real DOM nodes, appending them to `document.body`. The output proves Preact created real elements in @cliui/dom's tree — not browser elements, but a compatible DOM surface.

## Add reactivity and re-render

Static rendering is table stakes. Let's prove that Preact's reconciler actually updates the DOM when state changes. [Preact signals](https://preactjs.com/guide/v10/signals/) are reactive primitives that trigger re-renders when their value changes — no component-level state hooks needed:

```js
import {Window, polyfillEnvironment} from '@cliui/dom';
polyfillEnvironment(new Window());

const {h, render} = await import('preact');
const {signal} = await import('@preact/signals');

const count = signal(0);

function Counter() {
  return h(
    'div',
    null,
    h('button', {onClick: () => count.value++}, 'Increment'),
    h('span', null, ' Count: ', count),
  );
}

render(h(Counter, null), document.body);
console.log(document.body.innerHTML);

count.value = 1;
await new Promise((r) => queueMicrotask(r));
console.log(document.body.innerHTML);

count.value = 5;
await new Promise((r) => queueMicrotask(r));
console.log(document.body.innerHTML);
```

Run it. You should see:

```
<div><button>Increment</button><span> Count: 0</span></div>
<div><button>Increment</button><span> Count: 1</span></div>
<div><button>Increment</button><span> Count: 5</span></div>
```

The `count` signal is created outside the component and passed directly into the tree. When we set `count.value = 1`, Preact schedules an update that lands in the next microtask — we `await` it, then read the DOM. The second assignment to `5` does the same. This is the same reactivity that runs in a browser — `createElement`, `textContent` mutations — all executing against @cliui/dom instead of the browser DOM.

## See what the framework is doing

Every `createElement`, `appendChild`, and `textContent` mutation that Preact performs flows through the [hooks bridge](../learn/hooks-bridge.md) — the same notification system you'd use to build a renderer. Let's watch it happen:

```js
import {Window, HOOKS, polyfillEnvironment} from '@cliui/dom';

const win = new Window();
polyfillEnvironment(win);

const hooks = win[HOOKS];
hooks.createElement = (element) => {
  console.log(`create  <${element.localName}>`);
};
hooks.insertChild = (parent, child) => {
  const tag = child.nodeType === 1 ? `<${child.localName}>` : `"${child.data}"`;
  console.log(`insert  ${tag} → <${parent.localName}>`);
};
hooks.setText = (text, data) => {
  console.log(`setText  "${data}"`);
};

const {h, render} = await import('preact');

function App() {
  return h('div', {class: 'app'}, h('h1', null, 'Hello'));
}

render(h(App, null), document.body);
```

Run it. You should see:

```
create  <div>
create  <h1>
insert  "Hello" → <h1>
insert  <h1> → <div>
insert  <div> → <body>
```

Preact calls `document.createElement`, sets attributes, creates text nodes, and appends children — standard DOM operations. Each one fires a hook. A terminal renderer installed on the same hooks would receive every mutation and update the screen. The framework is the producer; the renderer is the consumer; the hooks bridge connects them.

If you've completed the [rendering backend tutorial](./rendering-backend.md), you've already built that consumer. The two tutorials are two sides of the same architecture.

## Caveats

`polyfillEnvironment` modifies `globalThis` permanently. This means one window per process — calling it again with a second `Window` silently replaces all globals. Isomorphic libraries that check `typeof window !== 'undefined'` will think they're in a browser and may take code paths that call unsupported APIs. And some libraries cache global references at import time, so always polyfill before other imports — the dynamic `await import()` pattern in this tutorial ensures that. For multi-window scenarios, work with `Window` instances directly. See [Scope and Boundaries](../learn/scope-and-boundaries.md) for the full picture.

## What you've learned

You ran a Preact application on @cliui/dom in Node.js. No browser, no build tools — just `h()` calls against a polyfilled environment. Preact's reconciler created elements, set attributes, updated text nodes, and re-rendered on state changes, all through the same DOM APIs it uses in a browser. Every one of those operations fired a hook. The framework is the producer. The renderer is the consumer. The hooks bridge connects them. The DOM doesn't care who's calling. Preact doesn't care who's answering.

React, Solid, Vue, and Svelte also work — the `examples/` directory in the repository has working demos for each.

## What's next

**Deep dives:**

- **[Building a Rendering Backend](./rendering-backend.md)** — how to observe the DOM mutations that frameworks produce, and build a renderer that reacts to them
- **[What Is @cliui/dom?](../learn/what-is-cliui-dom.md)** — the design philosophy and how it differs from jsdom and happy-dom
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — what's supported, what's not, and why
