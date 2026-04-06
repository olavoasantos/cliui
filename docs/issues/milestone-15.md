# Milestone 15: DevTools Bridge Enhancements — Issues

## Working Summary

Phase 15 extends the Chrome DevTools Protocol bridge (M8) with deeper integrations that unlock the remaining DevTools panels. The current bridge provides Elements inspection, Styles editing, Console evaluation, and basic Performance recording. This milestone fills the gaps: V8 inspector proxy for Sources/Memory/Profiling, network interception for the Network tab, and the browser lifecycle APIs needed for the Performance metric cards.

**Four groups of work:**

1. **V8 Inspector proxy (M15T1–M15T2):** Use Node's `node:inspector` module to create a V8 inspector session and proxy Debugger, Profiler, and HeapProfiler CDP commands through it. This unlocks the Sources tab (breakpoints, stepping, script sources), real CPU profiling in the Performance tab (flame charts with actual call stacks), and heap snapshots in the Memory tab — all with zero reimplementation.
2. **Network interception (M15T3):** Intercept `globalThis.fetch` and `node:http` requests to emit `Network.requestWillBeSent`, `Network.responseReceived`, and `Network.loadingFinished` events. Terminal applications that make HTTP requests (e.g., API calls) become visible in the Network tab.
3. **Performance metric cards (M15T4):** Implement the browser lifecycle APIs (`document.visibilityState`, `document.readyState`, `requestAnimationFrame`, `PerformanceObserver.supportedEntryTypes`, navigation timing entries) that Chrome's injected web-vitals script requires. The script uses these to observe LCP, CLS, and INP via standard PerformanceObserver, then reports results through a registered binding. Once these APIs exist, the script runs unmodified and the metric cards populate with real data.
4. **Terminal plugin integration (M15T5):** Expose the Terminal's internal StyleEngine, LayoutEngine, and Renderer via the plugin context so the DevToolsBridge can be installed as a plugin instead of requiring manual wiring. This gives the CSS domain access to real computed styles and the Overlay domain access to layout positions.

**Key context and design decisions:**

- **V8 inspector is a proxy, not a reimplementation.** Node's `inspector.Session` speaks the same CDP protocol that DevTools expects. We create a session, and when DevTools sends `Debugger.*`, `Profiler.*`, or `HeapProfiler.*` commands, we forward them to the V8 session and relay responses back. The only complexity is multiplexing: our WebSocket carries both our custom domain responses (DOM, CSS) and V8's responses on the same connection.
- **Network interception is non-destructive.** Like the Log domain's console tee, fetch interception wraps the original function, captures request/response metadata, and emits CDP events — without altering the actual network behavior.
- **Performance metric cards require ~6 DOM/Window API additions.** The web-vitals script (which Chrome injects via `Page.addScriptToEvaluateOnNewDocument`) checks `PerformanceObserver.supportedEntryTypes` before creating any observer. Without that static property, the entire script is a no-op. The remaining gaps are `document.visibilityState`, `document.readyState`, `requestAnimationFrame`, `requestIdleCallback`, and navigation timing entries in `performance.getEntriesByType('navigation')`.
- **Plugin integration avoids the second-StyleEngine problem.** M8 discovered that creating a separate StyleEngine for inspection overwrites the Terminal's hooks. The proper fix is exposing the Terminal's own engine instances via `TerminalPluginContext`, so the bridge reads from the same state the renderer uses.

---

## Issues

### M15T1: V8 inspector session and command proxy

**Summary**

Create a V8 inspector session via `node:inspector` and proxy CDP commands for the Debugger, Profiler, and HeapProfiler domains through it. This is the single highest-impact change — it unlocks three DevTools tabs (Sources, Performance profiling, Memory) without reimplementing any of them.

**Expected Outcomes**

- A `V8InspectorProxy` class exists in `cliui/devtools/src/classes/`
- Creates a `node:inspector` `Session` and connects it on construction
- Registers handlers for all `Debugger.*`, `Profiler.*`, and `HeapProfiler.*` methods on the CDPTransport
- When a CDP command arrives for a proxied domain, it is forwarded to the V8 session via `session.post(method, params)` and the V8 response is relayed back to DevTools
- V8 events (e.g., `Debugger.scriptParsed`, `Debugger.paused`, `HeapProfiler.addHeapSnapshotChunk`) are forwarded to DevTools as CDP events via `transport.broadcastEvent`
- The proxy replaces the existing stub handlers for these domains (the stubs become fallbacks only if V8 session creation fails)
- Graceful degradation: if `node:inspector` is unavailable or the session fails to connect, the stubs remain and DevTools panels show empty state instead of crashing
- `close()` disconnects the V8 session
- Unit tests verify: command forwarding, event relaying, graceful fallback

**Dependencies**

- M8T2: CDPTransport (the transport to register handlers on)

---

### M15T2: V8 proxy multiplexing and response correlation

**Summary**

Handle the multiplexing challenge: DevTools sends all commands over a single WebSocket, but our transport dispatches some to local handlers (DOM, CSS, Runtime) and others to the V8 proxy (Debugger, Profiler, HeapProfiler). V8 responses arrive asynchronously and must be correlated back to the correct CDP request ID.

**Expected Outcomes**

- CDP command IDs are mapped to pending V8 requests so responses from `session.post` callbacks are sent with the correct `id` to DevTools
- Local domain handlers and V8 proxy handlers coexist without conflicts — the CDPTransport's existing dispatch-by-method-name handles routing
- `Runtime.evaluate` remains handled locally (our custom scope with `$0`/`window`/`document`/`terminal`) — it is NOT proxied to V8, since V8's Runtime context is different from our terminal DOM context
- `Runtime.getProperties` for objects returned by our `Runtime.evaluate` are handled locally; for objects returned by V8 (e.g., from Debugger scope inspection), they are proxied
- V8 events that arrive between commands are buffered and sent to DevTools in order
- Integration tests verify: interleaved local and V8 commands produce correct responses, V8 events arrive at DevTools

**Dependencies**

- M15T1: V8 inspector session

---

### M15T3: Network domain — fetch and HTTP interception

**Summary**

Intercept `globalThis.fetch` and optionally `node:http`/`node:https` requests to emit CDP Network domain events. Terminal applications that make API calls become visible in the Network tab.

**Expected Outcomes**

- `Network.enable` activates interception; `Network.disable` restores originals
- `globalThis.fetch` is wrapped: before the request, emit `Network.requestWillBeSent` with URL, method, headers, and timestamp; after the response, emit `Network.responseReceived` with status, headers, and MIME type; after body is consumed, emit `Network.loadingFinished` with encoded data length
- Each request gets a unique `requestId` for correlation across events
- Request/response bodies are optionally captured and available via `Network.getResponseBody`
- Interception is non-destructive — original fetch behavior is preserved (tee pattern, same as Log domain)
- `Network.setCacheDisabled`, `Network.setBlockedURLs` are acknowledged but not enforced (terminal has no HTTP cache)
- Unit tests verify: fetch interception emits correct events, response data is available, original fetch works, cleanup restores originals

**Dependencies**

- M8T2: CDPTransport (event emission)

---

### M15T4: Browser lifecycle APIs for Performance metric cards

**Summary**

Implement the DOM and Window APIs that Chrome's injected web-vitals script requires to populate the Performance tab's LCP, CLS, and INP metric cards. The script is injected via `Page.addScriptToEvaluateOnNewDocument` and uses standard browser APIs to observe performance entries. Once these APIs exist, the script runs unmodified.

**Expected Outcomes**

- `PerformanceObserver.supportedEntryTypes` static property returns the list of entry types the implementation supports (critical — without it, the web-vitals script creates zero observers)
- `PerformanceObserver.observe({type, buffered})` works with single-type syntax (already partially implemented; needs the `performance` parameter to be auto-injected from the window context instead of requiring explicit passing)
- `document.visibilityState` returns `'visible'` (terminal is always visible)
- `document.readyState` returns `'complete'` after `terminal.run()`
- `window.requestAnimationFrame(callback)` schedules callback before the next frame render
- `window.requestIdleCallback(callback)` schedules callback during idle time (or immediately via setTimeout)
- `performance.getEntriesByType('navigation')` returns a `PerformanceNavigationTiming`-like entry with `responseStart`, `activationStart`, `domInteractive`, `domContentLoadedEventStart`, `domComplete`, and `type` fields
- The DevToolsBridge executes the injected web-vitals script in the terminal's window context; the script creates observers, detects LCP/CLS/INP entries, and calls the `__chromium_devtools_metrics_reporter` binding — which emits `Runtime.bindingCalled` events that DevTools processes
- The Performance tab's "Local metrics" cards show real LCP, CLS, and INP values
- Unit tests for each new API; integration test verifying the web-vitals script produces binding calls

**Dependencies**

- M7T2–T3: Performance and PerformanceObserver (the entry types to observe)
- M8T13: DevToolsBridge (script execution and binding mechanism)

**Scope Note**

These APIs belong in `@cliui/dom` (Window, Document, PerformanceObserver) since they are standard Web APIs, not DevTools-specific. The DevToolsBridge code that executes the injected script and polyfills gaps belongs in `@cliui/devtools`.

---

### M15T5: Terminal plugin integration for DevToolsBridge

**Summary**

Extend `TerminalPluginContext` to expose the internal StyleEngine, LayoutEngine, and the current layout tree so that `DevToolsBridge` can be installed as a terminal plugin instead of requiring manual wiring with separate engine instances.

**Expected Outcomes**

- `TerminalPluginContext` gains `getStyleEngine()`, `getLayoutEngine()`, and `getLayoutRoot()` accessors
- `DevToolsBridge` can be constructed from a `TerminalPluginContext` — it reads computed styles from the Terminal's own StyleEngine (no second engine, no hook conflicts)
- The CSS domain's `getComputedStyleForNode` returns real computed values from the terminal's cascade (not the fallback matcher-based computation)
- The Overlay domain's `highlightNode` uses real layout positions from `getLayoutRoot()`
- `DOM.getBoxModel` returns accurate box model data from the layout tree
- Example updated: `new Terminal({ plugins: [devtools({ port: 9222 })] })` replaces the current manual bridge setup
- Unit tests verify: plugin installation, style engine access, layout tree access

**Dependencies**

- M8T13: DevToolsBridge
- M1T29: Terminal class (plugin system)

---
