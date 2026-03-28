---
'@micra/terminal-dom': minor
---

Add global environment polyfill and complete Window properties for framework compatibility. Importing `@micra/terminal-dom` now installs `document`, `window`, `navigator`, and DOM class constructors onto `globalThis` automatically. A side-effect-free `@micra/terminal-dom/core` entry point is available for environments where global mutation is unacceptable. The `Terminal` class accepts an optional `window` via its options, falling back to `globalThis.window` or creating a fresh instance.
