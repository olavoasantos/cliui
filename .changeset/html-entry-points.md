---
"@cliui/dom": minor
"@cliui/terminal": minor
"@cliui/vite-plugin": minor
---

HTML entry points and Vite integration

Make HTML files first-class entry points for terminal-dom applications. Parse full documents (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`), load external stylesheets via `<link rel="stylesheet">`, execute classic and module scripts in a VM context with the terminal's `window` scope, and fire document lifecycle events (`DOMContentLoaded`, `load`).

New classes: `parseDocument`, `HTMLScriptElement`, `HTMLLinkElement`, `ResourceResolver`, `StylesheetLoader`, `ScriptContext`, `ScriptExecutor`, `ModuleScriptExecutor`, `DocumentLifecycle`, `DocumentLoader`.

New Terminal API: `Terminal.loadDocument(html, options?)` and `Terminal.loadFile(path)`.

CLI runner: `npx @cliui/terminal <file.html>` with `--no-alt-screen`, `--fps`, and `--help` flags.

Vite plugin: `@cliui/vite-plugin` with dev mode, HMR (CSS hot-reload), and build mode (standalone Node.js output).
