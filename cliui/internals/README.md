<p align="center">
  <img src="./.config/assets/cliui-internals.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/internals</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/internals?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20internals%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/internals` is a private package that provides shared build, test, and lint configuration for all `@cliui/*` packages. It is not published to npm.

### What it provides

- **`tsconfig.base.json`** — shared TypeScript compiler options (ES2023, strict, bundler resolution)
- **`vite.base.ts`** — `createViteConfig()` factory for library-mode Vite builds with DTS generation, dual CJS/ESM output, and `@cliui/*` externalization
- **`vitest.unit.ts`** / **`vitest.integration.ts`** / **`vitest.bench.ts`** / **`vitest.e2e.ts`** — shared vitest configurations for each test type
- **`oxlint.json`** — shared oxlint rules
- **`.prettierrc.mjs`** — shared oxfmt formatting rules
- **`dom-globals.d.ts`** — ambient type declarations for DOM globals used across packages

Each package extends these via its own `tsconfig.json`, `vite.config.ts`, and `vitest.*.config.ts` files.

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
