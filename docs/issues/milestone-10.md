# Milestone 10: HTML Entry Points & Vite Integration — Issues

## Working Summary

Phase 10 makes HTML files first-class entry points for terminal-dom applications. Today, apps must start from a JavaScript/TypeScript file that imperatively builds the DOM. This milestone enables starting from an `index.html` — the same developer experience as the web. The framework parses the document, loads stylesheets, executes scripts in the terminal's `window` scope, and renders to the terminal.

**Four groups of work:**

1. **DOM layer (M10T1–M10T2):** Extend the HTML parser for full document structure and implement `HTMLScriptElement` and `HTMLLinkElement` classes.
2. **Resource loading (M10T3–M10T5):** Filesystem resource resolver, `<link rel="stylesheet">` loading, and `<script>` loading with `node:vm` execution context.
3. **Integration (M10T6–M10T8):** Module script support, document lifecycle events, and `Terminal.loadDocument` / `Terminal.loadFile` APIs.
4. **Tooling (M10T9–M10T12):** CLI runner (`npx terminal-dom index.html`) and Vite plugin with dev mode, HMR, and build output.

**Key context and design decisions:**

- **`parseHtml()` already exists** in `src/dom/utilities/` — a regex-based parser that handles elements, attributes, comments, and text nodes. It needs to be extended to handle full document structure (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`) by populating the existing document skeleton rather than creating new elements for those tags.
- **Same window, same document.** Scripts executed from `<script>` tags see the terminal's `window` and `document` as globals — the exact same object instances, not copies. This matches browser behavior where all scripts share one `window`.
- **`node:vm` for script isolation.** `vm.createContext()` with the terminal's `window` properties creates an isolated global scope. Objects passed into the context are shared references (same heap) — mutations inside the VM affect the real DOM. Verified: method calls, property mutations, and object sharing all work correctly across the context boundary.
- **`instanceof` caveat with `vm` contexts.** `obj instanceof Object` returns `false` inside a VM context because the context has its own `Object` prototype. This is a known Node.js behavior. Code should use duck-typing or property checks rather than `instanceof` for cross-context objects. The DOM polyfill's internal code (which runs outside the VM) is unaffected — only user scripts run inside the VM.
- **Module scripts need special handling.** `vm.SourceTextModule` exists behind `--experimental-vm-modules` in Node. For `<script type="module" src="./app.ts">`, the practical approach depends on the execution path:
  - **CLI runner:** Use `vm.SourceTextModule` (with the experimental flag) or fall back to `import()` with global injection for stable Node support.
  - **Vite plugin:** Vite transforms modules through its pipeline and can wrap them to inject globals — no `vm` needed since Vite controls the transform.
- **`<link rel="stylesheet">` loads from filesystem.** Resolve `href` relative to the HTML file's directory, read the file, parse the CSS, and inject into the style engine. Parsed results are cached to avoid re-reading and re-parsing on style recalculation. This matches browser behavior (resolve URL, fetch, parse, apply) adapted for the filesystem.
- **`<link>` only supports `rel="stylesheet"`.** Other `rel` values (`icon`, `preload`, `prefetch`, etc.) are not applicable in a terminal context and are silently ignored.
- **Script ordering matches browsers.** Scripts in `<head>` (without `defer`) block body parsing. Scripts in `<body>` execute after preceding elements are parsed. `defer` scripts execute after the full document is parsed. `async` scripts execute when loaded (filesystem reads are near-instant, so `async` behaves like inline for local files). `DOMContentLoaded` fires after all synchronous and deferred scripts. `load` fires after all resources (stylesheets) are loaded.
- **The Vite plugin is a separate package.** It uses Vite's existing transform pipeline for TypeScript compilation, module resolution, and HMR infrastructure. The terminal-dom core provides the document loading API; the plugin provides the DX layer.
- **The CLI runner is in the main package.** It adds a `bin` entry to `package.json` so `npx @micra/terminal-dom index.html` works. For TypeScript files referenced in `<script src>`, the CLI checks for `tsx` availability or uses Node's `--experimental-strip-types`.

**The developer experience:**

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./styles.css">
  <style>
    .status { color: #93c5fd; }
  </style>
</head>
<body>
  <div class="app">
    <div class="header">My Terminal App</div>
    <div class="status" id="status">Loading...</div>
  </div>
  <script type="module" src="./app.ts"></script>
</body>
</html>
```

```css
/* styles.css */
.app {
  display: flex;
  flex-direction: column;
  padding: 1;
  gap: 1;
}
.header {
  border-style: rounded;
  border-color: #7c3aed;
  padding: 1;
  font-weight: bold;
  color: #c4b5fd;
}
```

```ts
// app.ts — window and document are globals, same as browser
const status = document.getElementById('status');
status.textContent = 'Ready';

document.body.addEventListener('keydown', (e) => {
  if (e.key === 'q') terminal.exit();
});
```

```bash
# CLI
npx @micra/terminal-dom index.html

# Or with Vite
npx vite dev  # reads index.html, runs in terminal
npx vite build  # outputs distributable Node.js app
```

---

## Issues

### M10T1: Full HTML document parser

**Summary**

Extend `parseHtml()` (or implement a new `parseDocument()` utility) to handle full HTML document structure. The current parser handles fragments — it creates new elements for every tag it encounters. A document parser needs to recognize the structural tags (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`) and populate the existing `Document` skeleton rather than creating duplicates.

**Expected Outcomes**

- A `parseDocument` utility exists in `src/dom/utilities/` that takes an HTML string and a `Document` instance, and populates the document's existing `html`, `head`, and `body` elements
- `<!DOCTYPE html>` is recognized and skipped (no DOM node created — terminal-dom doesn't need doctype information)
- Content inside `<head>...</head>` is appended to `document.head`
- Content inside `<body>...</body>` is appended to `document.body`
- Attributes on `<html>`, `<head>`, and `<body>` tags are applied to the existing elements (e.g., `<body class="dark">` sets `document.body.className = 'dark'`)
- Content outside `<head>` and `<body>` but inside `<html>` is appended to `document.body` (matching browser behavior for stray content)
- If `<html>`, `<head>`, or `<body>` tags are absent, content is appended to `document.body` (graceful degradation — a bare fragment is valid input)
- The existing `parseHtml()` for fragments is not modified — it continues to work for `innerHTML`
- Unit tests cover: full document with all structural tags, missing structural tags (fragment-only), attributes on structural elements, `<style>` in `<head>`, nested elements in `<body>`, comments, and text nodes

**Dependencies**

- M1T1–M1T5: DOM classes (Document, Element, etc.)

---

### M10T2: HTMLScriptElement and HTMLLinkElement

**Summary**

Implement `HTMLScriptElement` and `HTMLLinkElement` classes in the DOM polyfill. These provide the DOM interface for `<script>` and `<link>` elements — attribute tracking, insertion detection via the hooks bridge, and integration points for the resource loader.

**Expected Outcomes**

- `HTMLScriptElement` class exists in `src/dom/classes/` with properties: `src`, `type` (default `""`, supports `"module"`), `defer`, `async`, `textContent` (inline script body)
- `HTMLLinkElement` class exists in `src/dom/classes/` with properties: `rel`, `href`, `type`, `sheet` (returns the loaded stylesheet text, or `null` if not loaded)
- `HTMLLinkElement` only activates loading behavior for `rel="stylesheet"` — other `rel` values are silently ignored
- Both classes are registered in `createElement()` dispatch (`src/dom/utilities/createElement.ts`) so `document.createElement('script')` and `document.createElement('link')` produce the correct class instances
- Both classes expose lifecycle hooks (or events) for insertion into the document tree — the resource loader (M10T3) consumes these to trigger loading
- Unit tests cover: element creation, attribute get/set, insertion detection, and `createElement` dispatch

**Dependencies**

- M1T2: Element class (base class)
- M1T5: Hooks bridge (insertion detection)

---

### M10T3: Filesystem resource resolver and cache

**Summary**

Implement a resource resolver that resolves `href` and `src` paths relative to the document's base path (the directory of the HTML file) and reads files from the filesystem. Includes a cache layer to avoid re-reading and re-parsing files that haven't changed.

**Expected Outcomes**

- A `ResourceResolver` class exists in `src/dom/classes/` (or `src/terminal/classes/` — placement depends on whether it's a DOM concern or a terminal concern)
- Resolves relative paths (`./styles.css`, `../shared/base.css`) against a configurable base directory
- Resolves absolute paths (`/src/styles.css`) against a configurable root directory
- Reads files from the filesystem using `node:fs` — synchronous for initial document load, async API available for dynamic insertions
- Cache layer: stores file contents keyed by resolved path, with `mtime` checking to detect changes (for file watching / HMR scenarios)
- Cache can be explicitly cleared or invalidated per path
- Handles missing files gracefully: emits an `error` event on the requesting element (matching browser behavior for 404s) rather than throwing
- Unit tests cover: relative path resolution, absolute path resolution, file reading, cache hit/miss, `mtime` invalidation, and missing file error handling

**Dependencies**

- None (standalone utility, uses `node:fs` and `node:path`)

---

### M10T4: Stylesheet loading

**Summary**

When a `<link rel="stylesheet">` element is inserted into the document, resolve the `href`, load the CSS file via the resource resolver, parse it, and feed it to the style engine. This is the terminal-dom equivalent of the browser loading an external stylesheet.

**Expected Outcomes**

- When a `<link rel="stylesheet" href="...">` is inserted into the document (via parsing or dynamic insertion), the resource resolver loads the CSS file
- The loaded CSS text is parsed by the `CSSParser` and the resulting rules are fed to the `StyleEngine`
- The `<link>` element's `sheet` property returns the loaded CSS text (matching `HTMLStyleElement.sheet` behavior)
- Multiple `<link>` elements are supported — their stylesheets participate in the cascade in document order (same as multiple `<style>` elements)
- When a `<link>` element is removed from the document, its stylesheet rules are removed from the style engine
- When a `<link>` element's `href` attribute changes, the old stylesheet is unloaded and the new one is loaded
- If the file cannot be read, an `error` event is dispatched on the `<link>` element and no stylesheet is added
- Integration tests verify: external stylesheet rules affect element computed styles, multiple external stylesheets cascade correctly, removal removes rules, and `href` changes reload

**Dependencies**

- M10T2: HTMLLinkElement (the element class)
- M10T3: Resource resolver (file loading)
- M1T12–M1T15: Style engine (CSS parsing and cascade)

---

### M10T5: Script execution context

**Summary**

Set up a `node:vm` execution context for running `<script>` content with the terminal's `window` and `document` as globals. Scripts must see the same object instances as the terminal — not copies.

**Expected Outcomes**

- A `ScriptContext` class exists in `src/terminal/classes/` that creates and manages a `vm` context
- The context is populated with the terminal's `window` object and all its properties — `document`, `console`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `queueMicrotask`, `performance` (from M7), `PerformanceObserver`, `MutationObserver`, `Event`, `CustomEvent`, and all other globals exposed on `Window`
- The `terminal` instance itself is available as a global in the context (for `terminal.exit()`, etc.)
- Scripts executed in the context can call methods on DOM objects (e.g., `document.getElementById('x').setAttribute('a', 'b')`) and the mutations affect the real DOM
- Scripts can add event listeners that fire when events are dispatched on the real DOM
- `this` at the top level of a non-module script refers to `window` (matching browser behavior)
- The context is created once per `Terminal` instance and reused for all script executions
- Unit tests cover: global access (`window`, `document`, `console`), DOM mutation from inside the context, event listener registration, `this` binding, and object identity (`document` inside context `===` terminal's document outside context)

**Dependencies**

- M1T3: Window class (the global scope source)
- M1T29: Terminal class (provides the terminal instance)

---

### M10T6: Inline and external script execution

**Summary**

Execute `<script>` elements — both inline (text content) and external (`src` attribute) — in the VM context. Non-module scripts are executed via `vm.runInContext()`. External scripts are loaded via the resource resolver before execution.

**Expected Outcomes**

- When a `<script>` element (without `type="module"`) is processed:
  - Inline script: `vm.runInContext(textContent, context)` executes the script
  - External script (`src="./app.js"`): the resource resolver loads the file, then `vm.runInContext(fileContent, context)` executes it
- Scripts execute synchronously during document parsing (matching browser behavior for non-deferred, non-async scripts)
- Script errors are caught and dispatched as `error` events on the `<script>` element and on `window` (matching `window.onerror` behavior)
- If an external script's file cannot be found, an `error` event is dispatched on the `<script>` element
- `<script>` elements with an unrecognized `type` attribute (other than `""`, `"text/javascript"`, `"module"`) are ignored (matching browser behavior)
- Unit tests cover: inline script execution, external script loading and execution, error handling, unrecognized type ignored, and DOM modifications from scripts

**Dependencies**

- M10T2: HTMLScriptElement (the element class)
- M10T3: Resource resolver (external file loading)
- M10T5: Script execution context (the VM context)

---

### M10T7: Module script support

**Summary**

Support `<script type="module">` — ES module scripts that use `import`/`export`. Module scripts have different semantics from classic scripts: they are deferred by default, execute in strict mode, and support `import` statements. This is the primary script type for modern applications and the path that Vite uses.

**Expected Outcomes**

- `<script type="module" src="./app.js">` loads and executes as an ES module
- `<script type="module">import { ... } from './module.js'; ...</script>` inline module scripts are supported
- Module scripts are deferred by default — they execute after the document is fully parsed (matching browser behavior)
- Import specifiers are resolved relative to the script's file path (for external scripts) or the document's base path (for inline modules)
- **CLI path:** Uses `vm.SourceTextModule` (behind `--experimental-vm-modules`) for full VM context integration, with a fallback to dynamic `import()` with global injection for stable Node support
- **Vite path:** Module resolution and transformation are handled by Vite's pipeline (M10T11) — this task focuses on the non-Vite execution path
- TypeScript files (`.ts`, `.tsx`) referenced in `src` are handled when a TypeScript loader is available (Node's `--experimental-strip-types`, or `tsx` if installed) — otherwise, a clear error message indicates TypeScript support requires a loader or the Vite plugin
- Module scripts do not re-execute if the same module is imported multiple times (module caching, matching browser behavior)
- Unit tests cover: external module loading, inline module execution, deferred execution order, import resolution, and module caching

**Dependencies**

- M10T5: Script execution context (the VM context)
- M10T6: Script execution infrastructure (error handling patterns, resource loading)

---

### M10T8: Script ordering and document lifecycle events

**Summary**

Implement correct script execution ordering and document lifecycle events. This matches browser behavior: scripts execute at specific points during document parsing, and lifecycle events fire when parsing and loading are complete.

**Expected Outcomes**

- **Execution order:**
  - Classic `<script>` in `<head>` (no `defer`/`async`): executes immediately, blocks body parsing
  - Classic `<script>` in `<body>` (no `defer`/`async`): executes after preceding elements are parsed
  - `<script defer>`: executes after the full document is parsed, before `DOMContentLoaded`, in document order
  - `<script async>`: executes when loaded (for filesystem, this is effectively immediate — but does not block parsing)
  - `<script type="module">`: deferred by default (same timing as `defer`)
- **Lifecycle events:**
  - `DOMContentLoaded` fires on `document` after the document is parsed and all synchronous + deferred scripts have executed
  - `load` fires on `window` after `DOMContentLoaded` and after all resources (stylesheets via `<link>`) are loaded
- Scripts can register listeners for these events: `document.addEventListener('DOMContentLoaded', ...)` and `window.addEventListener('load', ...)`
- Unit tests cover: head script blocks body, body script sees preceding elements, defer order, async timing, module defer behavior, `DOMContentLoaded` timing, `load` timing, and listener registration from within scripts

**Dependencies**

- M10T6: Script execution (classic scripts)
- M10T7: Module script support (module defer behavior)
- M10T4: Stylesheet loading (for `load` event timing)

---

### M10T9: Document loading API

**Summary**

Expose the document loading capability through the `Terminal` class. This is the programmatic API that the CLI runner and Vite plugin both use internally.

**Expected Outcomes**

- `Terminal.loadDocument(html, options?)` parses an HTML string into the terminal's document, loads resources, and executes scripts
  - `options.baseDir` — base directory for resolving relative paths (defaults to `process.cwd()`)
  - Returns a `Promise` that resolves after all scripts execute and `DOMContentLoaded` fires
- `Terminal.loadFile(path)` reads an HTML file from the filesystem and delegates to `loadDocument` with `baseDir` set to the file's directory
  - Returns a `Promise` that resolves after loading completes
- Both methods can be called before or after `terminal.run()` — if called before, the document is populated before the first frame renders; if called after, the document is populated and triggers a re-render
- Error handling: script errors and missing resource errors are surfaced via events on the relevant elements and on `window`, not by rejecting the returned promise (matching browser behavior where a broken script doesn't prevent page load)
- Integration tests verify: `loadFile` with a real HTML file populates the DOM correctly, stylesheets are loaded, scripts execute, lifecycle events fire, and the terminal renders the result

**Dependencies**

- M10T1: Document parser (parses the HTML)
- M10T4: Stylesheet loading (loads `<link>` resources)
- M10T6: Script execution (executes `<script>` elements)
- M10T8: Script ordering and lifecycle (orchestrates execution order)
- M1T29: Terminal class (the integration target)

---

### M10T10: CLI runner

**Summary**

Add a CLI entry point so developers can run terminal-dom applications directly from an HTML file: `npx @micra/terminal-dom index.html`. This provides a zero-config way to run HTML-based terminal apps without a bundler.

**Expected Outcomes**

- A `bin` entry is added to `package.json` pointing to a CLI script
- `npx @micra/terminal-dom <file.html>` creates a `Terminal` instance, calls `loadFile(path)`, and calls `run()`
- `npx @micra/terminal-dom <file.html> --no-alt-screen` disables alternate screen mode (for debugging)
- `npx @micra/terminal-dom <file.html> --fps <n>` sets the frame rate
- `npx @micra/terminal-dom <file.html> --watch` watches the HTML file and referenced resources for changes, reloading on change
- Clear error messages for: file not found, HTML parse errors, script execution errors, missing TypeScript loader
- For TypeScript `<script src>` references: checks for `tsx` availability, then Node's `--experimental-strip-types` — if neither is available, prints a clear message suggesting installation of `tsx` or use of the Vite plugin
- `--help` prints usage information
- Unit tests cover: argument parsing and validation; integration tests cover: loading and running a simple HTML file

**Dependencies**

- M10T9: Document loading API (`Terminal.loadFile`)

---

### M10T11: Vite plugin — dev mode

**Summary**

Implement `vite-plugin-terminal-dom` — a Vite plugin that makes `vite dev` work for terminal applications. The plugin intercepts the HTML entry point, uses Vite's transform pipeline for TypeScript and module resolution, and runs the result in a terminal instead of serving to a browser.

**Expected Outcomes**

- The plugin is a separate package (e.g., `packages/vite-plugin-terminal-dom/` or a standalone repo — placement is a project structure decision)
- Registers as a Vite plugin: `plugins: [terminalDom()]` in `vite.config.ts`
- **Dev mode (`vite dev`):**
  - Reads `index.html` as the entry point (Vite's default behavior)
  - Intercepts Vite's server startup to launch a terminal instance instead of (or alongside) an HTTP server
  - `<script type="module" src="./app.ts">` is transformed by Vite's pipeline (TypeScript compilation, import resolution, dependency pre-bundling)
  - `<link rel="stylesheet" href="./styles.css">` is resolved and loaded through Vite's CSS pipeline (supporting CSS imports, PostCSS if configured, etc.)
  - `<style>` blocks are passed directly to the terminal's style engine
  - The terminal renders to the current terminal (stdout) — no browser window opens
  - Ctrl+C exits cleanly (terminal modes restored)
- Scripts receive `window`, `document`, and `terminal` as globals via module wrapping (Vite transforms the code — no `node:vm` needed)
- Integration tests verify: a minimal Vite project with `index.html` + `app.ts` starts and renders to the terminal

**Dependencies**

- M10T9: Document loading API (the core API the plugin builds on)
- M10T1: Document parser (HTML parsing)

---

### M10T12: Vite plugin — HMR

**Summary**

Add hot module replacement support to the Vite plugin. CSS changes hot-reload without restarting the terminal. Script changes trigger a module re-evaluation or full reload depending on the change scope.

**Expected Outcomes**

- **CSS HMR:** When a `.css` file referenced by `<link>` or imported in a module changes, the stylesheet is re-parsed and re-injected into the style engine. The terminal re-renders with updated styles. No terminal restart, no state loss.
- **`<style>` block HMR:** When the `<style>` block in `index.html` changes, the style engine is updated and the terminal re-renders.
- **Script HMR:** When a module changes, Vite's HMR system triggers. The plugin handles the HMR update by:
  - For modules that export an HMR-compatible `accept` handler: re-execute the module
  - For other modules: full terminal reload (re-parse document, re-execute all scripts)
- **HTML HMR:** When `index.html` itself changes (structure changes), trigger a full terminal reload
- A console message indicates what was hot-reloaded (e.g., `[terminal-dom] styles.css updated`)
- Full reload preserves terminal modes (alt screen, raw mode) — the terminal is not exited and re-entered
- Integration tests verify: CSS change → terminal re-renders with new styles without restart; script change → module re-evaluates or terminal reloads

**Dependencies**

- M10T11: Vite plugin dev mode (the plugin being extended)

---

### M10T13: Vite plugin — build mode

**Summary**

Support `vite build` to produce a distributable Node.js application from an HTML entry point. The output is a standalone script that creates a `Terminal`, loads the inlined HTML/CSS, and runs.

**Expected Outcomes**

- `vite build` with the terminal-dom plugin produces a Node.js entry point (e.g., `dist/index.js`)
- All `<script>` modules are bundled into the output (Vite's default bundling behavior)
- All `<link rel="stylesheet">` and `<style>` blocks are inlined into the HTML string embedded in the output
- The output script:
  1. Imports `Terminal` from `@micra/terminal-dom`
  2. Creates a terminal instance
  3. Calls `loadDocument(inlinedHtml)` with the bundled HTML (styles inlined, scripts bundled)
  4. Calls `run()`
- The output runs with `node dist/index.js` — no Vite or dev dependencies needed at runtime
- Build output respects Vite's `build.outDir`, `build.minify`, and other standard build options
- Integration tests verify: build a minimal project → output file exists → `node dist/index.js` runs and renders

**Dependencies**

- M10T11: Vite plugin dev mode (the plugin being extended)

---
