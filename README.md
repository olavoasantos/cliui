<p align="center">
  <img src="./cliui/terminal/.config/assets/cliui-terminal.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">cliui</h1>

<p align="center">
  A framework-agnostic terminal UI library that uses a DOM polyfill as its document model, CSS as its styling language, and a custom renderer that paints to the terminal via ANSI escape sequences.
</p>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

There's no good framework-agnostic terminal UI library in the JS/TS ecosystem. React Ink is coupled to React and visually limited. Go's Charm ecosystem (Bubbletea, Lipgloss, Bubbles) produces beautiful terminal UIs but is Go-only.

**cliui** fills the gap. It provides a real DOM layer so any framework that produces DOM mutations — vanilla JS, Preact, Solid, Vue, Svelte, React — works out of the box. You write terminal UIs with the same mental model as the web: elements, CSS, events, selectors.

### How it works

```
User code (any framework)
        │ DOM mutations
        ▼
   DOM Polyfill        ← @cliui/dom
        │ style changes + tree mutations
        ▼
   Style Engine        ← @cliui/terminal
        │ computed styles
        ▼
   Layout Engine       ← @cliui/terminal
        │ layout boxes
        ▼
   Renderer            ← @cliui/terminal
        │ ANSI escape sequences
        ▼
   Terminal
```

## Quick start

```shell
pnpm install @cliui/terminal
```

```ts
import {Terminal} from '@cliui/terminal';

const terminal = new Terminal();
const doc = terminal.document;

const container = doc.createElement('div');
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.padding = '1';
container.style.borderStyle = 'rounded';
container.style.borderColor = '#7c3aed';

const title = doc.createElement('span');
title.textContent = 'Hello, Terminal!';
title.style.fontWeight = 'bold';
title.style.color = '#7c3aed';

container.appendChild(title);
doc.body.appendChild(container);

await terminal.run();
```

### With a framework

```tsx
// Preact
import {Terminal} from '@cliui/terminal';
import {render} from 'preact';

const terminal = new Terminal();

function App() {
  return (
    <div style={{display: 'flex', borderStyle: 'rounded', padding: 1}}>
      <span style={{fontWeight: 'bold', color: '#7c3aed'}}>Hello from Preact!</span>
    </div>
  );
}

render(<App />, terminal.document.body);
await terminal.run();
```

## Packages

| Package | Description |
|---------|-------------|
| [`@cliui/dom`](./cliui/dom) | Standalone DOM polyfill for Node.js |
| [`@cliui/terminal`](./cliui/terminal) | Terminal UI engine — CSS, layout, renderer, and terminal I/O |
| [`@cliui/elements`](./cliui/elements) | Component library — buttons, inputs, tables, menus, and more |
| [`@cliui/devtools`](./cliui/devtools) | Chrome DevTools Protocol bridge *(coming soon)* |
| [`@cliui/vite-plugin`](./cliui/vite-plugin) | Vite integration — dev mode, HMR, and build *(coming soon)* |

## Examples

The [`examples/`](./examples) directory has working applications for:

- [**basic**](./examples/basic) — vanilla JS with component demos
- [**preact**](./examples/preact) — Preact + JSX
- [**react**](./examples/react) — React 19
- [**solid**](./examples/solid) — SolidJS
- [**svelte**](./examples/svelte) — Svelte 5
- [**vanilla**](./examples/vanilla) — vanilla JS with Vite
- [**vue**](./examples/vue) — Vue 3

## Inspirations

This project draws heavily from the work of others. In particular:

- **[Charm](https://charm.sh)** — The Go terminal ecosystem ([Bubbletea](https://github.com/charmbracelet/bubbletea), [Lipgloss](https://github.com/charmbracelet/lipgloss), [Bubbles](https://github.com/charmbracelet/bubbles), [Harmonica](https://github.com/charmbracelet/harmonica), [Huh](https://github.com/charmbracelet/huh), [Glow](https://github.com/charmbracelet/glow)) proved that terminal UIs can be beautiful and developer-friendly. Bubbletea's render loop, Lipgloss's border and color systems, and Bubbles' component patterns were primary references throughout.
- **[@remote-dom/polyfill](https://github.com/Shopify/remote-dom)** — The DOM polyfill that serves as the foundation of `@cliui/dom`. Forked and extended with MutationObserver, CSSStyleDeclaration, classList, and more.
- **[Happy DOM](https://github.com/nicedoc/happy-dom)** — Reference implementation for DOM APIs the original polyfill didn't cover (MutationObserver, CSSStyleDeclaration, DOMTokenList).
- **[string-width](https://github.com/sindresorhus/string-width)** and **[get-east-asian-width](https://github.com/sindresorhus/get-east-asian-width)** — Reference for grapheme-aware terminal cell width measurement. The approach was reimplemented using `Intl.Segmenter` to avoid runtime dependencies.
- **[Yoga](https://github.com/nicedoc/yoga-layout)** — Facebook's flexbox layout engine. The two-pass flex distribution, min/max constraint freezing, FitContent zeroing, and stretch re-layout in `FlexLayout` were aligned against Yoga's algorithm for correctness.
- **[Pretext](https://github.com/nicedoc/pretext)** — Chenglou's text measurement library. The two-phase prepare/layout architecture, ASCII fast-path gating, and deferred `Intl.Segmenter` usage for non-ASCII text in `TextLayout` follow Pretext's approach.
- **[Ink](https://github.com/vadimdemedes/ink)** — Showed that React-in-the-terminal is viable. cliui takes a different path by making the DOM itself the abstraction layer rather than coupling to one framework.

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
