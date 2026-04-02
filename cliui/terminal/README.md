<p align="center">
  <img src="./.config/assets/cliui-terminal.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/terminal</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/terminal?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20terminal%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/terminal` is the engine that powers terminal rendering. It takes a DOM tree (from `@cliui/dom`), computes styles via a built-in CSS engine, runs flexbox layout, paints into a cell buffer, diffs against the previous frame, and emits minimal ANSI escape sequences to the terminal.

This is the main package most users install. It re-exports key DOM types (`Document`, `Element`, `Window`, `Event`, etc.) from `@cliui/dom` for convenience, so a single import covers both DOM and engine APIs.

### What's inside

- **CSS engine** — hand-written parser for a CSS subset, selector matching with full specificity and cascade, inheritance, `<style>` block support, and CSS custom properties (`var()`)
- **Layout engine** — flexbox algorithm (`display: block` is sugar for `flex-direction: column`), box model (padding, border, margin in terminal cells), text measurement with grapheme-aware cell widths, word wrapping, and absolute positioning
- **Renderer** — 2D cell buffer, box-drawing borders (single, rounded, double, thick, block, half-block, ascii), cell-by-cell diffing, and ANSI escape sequence generation with truecolor/256/16-color support
- **Terminal I/O** — alternate screen, raw mode, keyboard/mouse/paste input parsing, focus management, hit-testing, resize handling, and synchronized output
- **`Terminal` class** — wires everything together with a frame loop: collect mutations → recompute styles → layout → render

### Subpath exports

For advanced use cases (like the DevTools bridge), individual engine layers are available:

```ts
import {StyleEngine} from '@cliui/terminal/css';
import {LayoutEngine} from '@cliui/terminal/layout';
import {Renderer} from '@cliui/terminal/renderer';
```

## Usage

```shell
pnpm install @cliui/terminal
```

```ts
import {Terminal} from '@cliui/terminal';

const terminal = new Terminal();
const doc = terminal.document;

const box = doc.createElement('div');
box.style.borderStyle = 'rounded';
box.style.borderColor = '#7c3aed';
box.style.padding = '1 2';

const text = doc.createElement('span');
text.textContent = 'Hello, Terminal!';
text.style.fontWeight = 'bold';
text.style.color = '#7c3aed';

box.appendChild(text);
doc.body.appendChild(box);

await terminal.run();
```

Use the side-effect-free entry point when you don't want the global polyfill:

```ts
import {Terminal, Window} from '@cliui/terminal/core';

const window = new Window();
const terminal = new Terminal({window});
```

## Inspirations

- **[Bubbletea](https://github.com/charmbracelet/bubbletea)** — Terminal mode management, render loop lifecycle, keyboard/mouse escape sequence parsing, and cell buffer architecture with differential rendering.
- **[Lipgloss](https://github.com/charmbracelet/lipgloss)** — Border character sets, ANSI 16/256/truecolor color handling, color downsampling, and z-order compositing.
- **[string-width](https://github.com/sindresorhus/string-width)** and **[get-east-asian-width](https://github.com/sindresorhus/get-east-asian-width)** — Grapheme-aware terminal cell width measurement (reimplemented with `Intl.Segmenter` for zero dependencies).

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
