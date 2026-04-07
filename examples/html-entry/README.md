# HTML Entry Point Example

Demonstrates using HTML files as first-class entry points for terminal-dom applications.

## What it shows

- Loading a full HTML document (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
- External stylesheet loading via `<link rel="stylesheet">`
- Inline `<style>` blocks in `<head>`
- Script execution with full DOM access (`document.querySelector`, event listeners)
- Document lifecycle events (`DOMContentLoaded`, `load`)
- Terminal keyboard input handling

## Running

```bash
cd examples/html-entry
pnpm install
pnpm start
```

Press `q` to exit.

## How it works

1. `run.ts` creates a `Terminal` instance and calls `terminal.loadFile('index.html')`
2. The framework parses the HTML document, populating the terminal's DOM
3. External stylesheets (`styles.css`) are loaded from the filesystem
4. Inline `<style>` blocks are parsed and fed to the style engine
5. `<script>` tags execute in the terminal's `window` scope — `document`, `window`, and `terminal` are all available as globals
6. The terminal renders the styled DOM to the terminal
