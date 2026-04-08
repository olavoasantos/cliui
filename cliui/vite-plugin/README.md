<p align="center">
  <img src="./.config/assets/cliui-plugins.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/vite-plugin</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/vite-plugin?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20vite-plugin%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/vite-plugin` provides Vite integration for `@cliui/terminal`. HTML files become first-class entry points for terminal apps — with hot module replacement for CSS, script re-evaluation, and a production build that outputs standalone Node.js bundles.

### Features

- **Dev mode** — intercept HTML entry points, use Vite's transform pipeline for TypeScript/module resolution, run in the terminal instead of a browser
- **HMR** — CSS changes hot-reload without restart, script changes trigger full reload
- **Build mode** — `vite build` outputs a standalone `node dist/index.js` with bundled scripts, inlined styles, and embedded HTML

## Usage

```shell
pnpm install @cliui/vite-plugin
```

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
