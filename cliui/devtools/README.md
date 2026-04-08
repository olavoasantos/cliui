<p align="center">
  <img src="./.config/assets/cliui-devtools.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/devtools</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/devtools?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20devtools%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/devtools` provides a Chrome DevTools Protocol (CDP) bridge for `@cliui/terminal`. Inspect and edit terminal UIs using Chrome DevTools — DOM tree inspection, CSS editing, element highlighting, console forwarding, and performance profiling — all over a WebSocket connection.

### Features

- **DOM domain** — tree inspection, live mutations, inline editing, inspect-element mode
- **CSS domain** — matched styles with specificity, computed styles, stylesheet editing
- **Runtime domain** — `$0`, `evaluate()`, object inspection
- **Overlay domain** — box-model highlighting in the terminal
- **Performance domain** — frame metrics, tracing, terminal vitals (LCP, CLS, INP)
- **Network domain** — fetch and http/https request interception
- **V8 inspector proxy** — Sources panel (breakpoints, stepping), CPU profiling, memory inspection
- **Content preview** — Page.captureScreenshot and startScreencast for the preview panel

## Usage

```shell
pnpm install @cliui/devtools
```

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
