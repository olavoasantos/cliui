# Milestone 8: Chrome DevTools Protocol Bridge — Issues

## Working Summary

Phase 8 connects terminal-dom to Chrome DevTools via the Chrome DevTools Protocol (CDP). By implementing the relevant CDP domains over a WebSocket connection, developers can inspect the terminal DOM tree, debug styles with the full cascade, evaluate expressions in the console, and view performance metrics — all using the familiar Chrome DevTools frontend.

Terminal-dom is uniquely suited for this because its architecture mirrors a real browser's internals. The DOM polyfill, style engine with cascade and specificity, layout engine with box positions, and Performance API (M7) map directly to the CDP domains DevTools expects. This isn't a stub — it provides genuinely correct data because the architecture already computes it.

**Five groups of work:**

1. **Transport (M8T1–M8T2):** A minimal WebSocket server built on Node's `http` module (zero dependencies) and the CDP transport layer with target discovery.
2. **DOM domain (M8T3–M8T6):** Node registry, tree inspection, live mutation events via the hooks bridge, and inbound editing from DevTools.
3. **CSS domain (M8T7–M8T8):** Real matched rules with specificity from the style engine, computed styles, inline styles, stylesheet source text, and live style editing.
4. **Runtime & debugging (M8T9–M8T11):** Expression evaluation with terminal scope, object inspection, `$0` tracking, event listener introspection, and console message forwarding.
5. **Rendering & performance (M8T12–M8T13):** Element highlighting in the terminal when hovered in DevTools, and Performance domain integration with M7's `window.performance`.

The bridge is wired into the `Terminal` class as an opt-in development tool (M8T14).

**Key context and design decisions:**

- **Zero new dependencies.** The WebSocket server is implemented from scratch on Node's `http` module. CDP uses text-only JSON frames — no binary frame support needed. The RFC 6455 text frame protocol is straightforward to implement.
- **Target type must be `"page"`.** The HTTP discovery endpoint (`/json/list`) must report `type: "page"`. If it reports `"node"`, Chrome launches the Node.js inspector UI which permanently hides the Elements and Styles panels.
- **The hooks bridge (M1T5) drives reactivity.** DOM mutations already flow through the hooks system for style invalidation. The CDP bridge adds another consumer — the same `insertChild`, `removeChild`, `setAttribute`, `setText` hooks that drive style recomputation also emit CDP mutation events.
- **CSS domain uses real data.** `CSS.getMatchedStylesForNode` returns actual matched rules from the `SelectorMatcher` with selectors and specificity — not stubs. `CSS.getComputedStyleForNode` returns values from `StyleEngine.getComputedStyle()`. `CSS.getStyleSheetText` returns actual `<style>` element source text. This is the major advantage over a generic polyfill bridge.
- **CDP attribute format.** CDP requires attributes as a flat array: `["id", "app", "class", "container"]`, not key-value objects. `DOM.requestChildNodes` returns child nodes via a `DOM.setChildNodes` event, not in the response.
- **CSS ranges must be provided.** DevTools crashes when trying to position the edit cursor if CSS property ranges are missing. All CSS property entries must include a `range` object even if approximate.
- **EventTarget stores listeners** in an internal `Map` keyed by the `LISTENERS` symbol. `DOMDebugger.getEventListeners` can read this map to show attached listeners in DevTools.
- **Overlay highlighting** renders in the terminal itself — when you hover over an element in DevTools' Elements panel, the terminal visually highlights that element's box model (content, padding, border, margin regions) using color overlays or inverted cells.
- **Performance domain** forwards entries from `window.performance` (M7). Frame timing, FCP, LCP, and INP data are available in DevTools.
- **Source structure:** `src/devtools/` with `classes/`, `types/`, `constants/` subdirectories, following project conventions. Exported via a separate entry point (`@micra/terminal-dom/devtools`) so the bridge is tree-shakeable — zero cost when not imported.

**Implemented CDP domains:**

| Domain | Scope | Terminal-dom data source |
|---|---|---|
| **DOM** | Tree inspection, mutations, editing, search | DOM polyfill + hooks bridge |
| **CSS** | Matched rules, computed styles, stylesheets, editing | StyleEngine, SelectorMatcher, CSSParser |
| **Runtime** | Evaluation, object inspection, `$0` | Window, Document, Terminal instance |
| **Overlay** | Element highlighting | Layout engine (box positions) + Renderer |
| **Performance** | Metrics, timeline | `window.performance` (M7) |
| **Log** | Console messages | Console interception |
| **DOMDebugger** | Event listener inspection | EventTarget `LISTENERS` map |
| **Page** | Startup stubs | Minimal stubs for DevTools handshake |

**Stubbed domains (acknowledged to satisfy DevTools startup, no implementation):**

- `Page.enable`, `Page.getResourceTree` — minimal stubs
- `Network.enable` — acknowledged, no data
- `Inspector.enable` — acknowledged
- `Target.setAutoAttach` — acknowledged

---

## Issues

### M8T1: WebSocket server

**Summary**

Implement a minimal WebSocket server built on Node's `http` module. This server handles the HTTP upgrade handshake and text frame encoding/decoding per RFC 6455. Only text frames are needed — CDP communicates exclusively via JSON text messages. No binary frame support, no extensions, no compression.

**Expected Outcomes**

- A `WebSocketServer` class exists in `src/devtools/classes/`
- Handles the HTTP → WebSocket upgrade handshake (Sec-WebSocket-Key validation, SHA-1 accept hash)
- Encodes and decodes text frames per RFC 6455 (opcode 0x1), including frame masking/unmasking
- Handles control frames: ping/pong (opcode 0x9/0xA) and close (opcode 0x8)
- Supports multiple concurrent connections
- Emits connection, message, and close events per connection
- Zero external dependencies — built entirely on Node's `http` and `crypto` modules
- Unit tests cover: upgrade handshake, text frame round-trip, frame masking, ping/pong, close handshake, and multiple connections

**Dependencies**

- None (standalone networking class)

---

### M8T2: CDP transport and target discovery

**Summary**

Implement the CDP transport layer: an HTTP discovery endpoint and WebSocket message routing. Chrome DevTools connects by first querying `/json/list` to discover debuggable targets, then establishing a WebSocket connection to the target's debug URL. The transport dispatches incoming CDP commands to domain handlers and sends responses and events back.

**Expected Outcomes**

- A `CDPTransport` class exists in `src/devtools/classes/`
- HTTP discovery endpoint serves `/json` and `/json/list` with the target descriptor, including `type: "page"` (not `"node"` — critical for Elements panel visibility)
- HTTP discovery serves `/json/version` with protocol version information
- WebSocket connections on `/devtools/{targetId}` are routed to the CDP message handler
- Incoming messages are parsed as JSON and dispatched by domain (e.g., `DOM.getDocument` → DOM domain handler)
- Responses (`{ id, result }`) and events (`{ method, params }`) are sent back via WebSocket
- Startup handshake stubs respond to: `Page.enable`, `Page.getResourceTree`, `Inspector.enable`, `Network.enable`, `Target.setAutoAttach` — acknowledged with empty results to satisfy DevTools initialization
- Unit tests cover: discovery endpoint responses, WebSocket routing, message dispatch, response/event sending, and startup handshake completion

**Dependencies**

- M8T1: WebSocket server (the transport layer it runs on)

---

### M8T3: Node registry and DOM serialization

**Summary**

Implement the bidirectional node ↔ integer ID registry that CDP requires. CDP operates on integer `nodeId` values — every DOM method references nodes by ID, not by object reference. Also implement the node serialization logic that converts DOM nodes into the CDP `DOM.Node` format.

**Expected Outcomes**

- A `NodeRegistry` class exists in `src/devtools/classes/`
- Assigns unique integer IDs to DOM nodes on first encounter
- Provides bidirectional lookup: node → ID and ID → node
- Cleans up ID mappings when nodes are removed from the tree (via hooks bridge notifications)
- Serializes DOM nodes to CDP format: `nodeId`, `nodeType`, `nodeName` (uppercased), `localName` (lowercased), `nodeValue`, `childNodeCount`, `attributes` (flat array: `["key", "value", "key2", "value2"]`), and optionally `children` (recursive to a specified depth)
- Handles all node types: Element, Text, Comment, Document, DocumentFragment
- Unit tests cover: ID assignment and lookup, cleanup on removal, serialization of each node type, attribute flattening, depth-limited child serialization, and re-serialization after tree mutations

**Dependencies**

- M1T5: Hooks bridge (for removal notifications)
- M1T1–M1T4: DOM classes (the nodes being registered and serialized)

---

### M8T4: DOM domain — tree inspection

**Summary**

Implement the read-only DOM domain methods that DevTools uses to populate the Elements panel. This covers initial document retrieval, lazy child node loading, search, and HTML retrieval.

**Expected Outcomes**

- `DOM.enable` initializes the domain and begins tracking
- `DOM.getDocument` returns the serialized document tree (root → html → head + body) at a configurable depth
- `DOM.requestChildNodes` loads children for a node — responds with an acknowledgment and emits child nodes asynchronously via `DOM.setChildNodes` event (not in the response — this is a CDP requirement)
- `DOM.querySelector` and `DOM.querySelectorAll` execute selector queries against a given node and return matching node IDs
- `DOM.getOuterHTML` returns the serialized HTML of a node (uses the existing `serializeNode` utility from `src/dom/utilities/`)
- `DOM.resolveNode` returns a Runtime remote object reference for a given node ID (wires into the object registry)
- `DOM.setInspectedNode` tracks the currently inspected node and updates `window.$0`
- `DOMDebugger.getEventListeners` reads the `LISTENERS` map from `EventTarget` and returns attached event listeners for a given node (listener type, handler description, useCapture, once, passive)
- Unit tests cover each method against a populated DOM tree

**Dependencies**

- M8T2: CDP transport (message dispatch)
- M8T3: Node registry (node ↔ ID mapping and serialization)

---

### M8T5: DOM domain — live mutations

**Summary**

Wire the hooks bridge to emit CDP DOM mutation events in real time. When the terminal app mutates the DOM, DevTools' Elements panel updates automatically. This is the reactivity layer — the same hooks that drive style invalidation now also drive CDP event emission.

**Expected Outcomes**

- `hooks.insertChild` → `DOM.childNodeInserted` event (with `parentNodeId`, `previousNodeId`, and serialized `node`)
- `hooks.removeChild` → `DOM.childNodeRemoved` event (with `parentNodeId` and `nodeId`)
- `hooks.setAttribute` → `DOM.attributeModified` event (with `nodeId`, `name`, `value`)
- `hooks.removeAttribute` → `DOM.attributeRemoved` event (with `nodeId`, `name`)
- `hooks.setText` → `DOM.characterDataModified` event (with `nodeId`, `characterData`)
- Events are only emitted for nodes that DevTools has seen (registered in the node registry) — avoids flooding DevTools with events for nodes it hasn't expanded yet
- Integration tests verify: insert a child → DevTools receives `childNodeInserted`, modify attribute → DevTools receives `attributeModified`, etc.

**Technical Constraints**

- The hooks bridge supports multiple consumers. Style invalidation already uses hooks — the CDP bridge adds itself as an additional consumer without interfering.

**Dependencies**

- M8T3: Node registry (determines which nodes are tracked)
- M1T5: Hooks bridge (the mutation source)

---

### M8T6: DOM domain — inbound editing

**Summary**

Handle DOM mutation commands sent from DevTools when a user edits the Elements panel. When the user changes an attribute, deletes a node, or edits text in DevTools, the corresponding CDP command mutates the terminal DOM, which triggers the hooks bridge, which updates styles and triggers a re-render — completing the two-way binding loop.

**Expected Outcomes**

- `DOM.setAttributeValue` calls `element.setAttribute(name, value)` on the target node
- `DOM.setAttributesAsText` parses a raw attribute string (e.g., `class="btn" id="main"`) into key-value pairs and applies them — handles the DevTools text editing format where multiple attributes are sent as a single string
- `DOM.removeAttribute` calls `element.removeAttribute(name)`
- `DOM.removeNode` calls `node.parentNode.removeChild(node)`
- `DOM.setNodeValue` sets `node.nodeValue` (for text and comment nodes)
- `DOM.setOuterHTML` replaces a node's outer HTML using the serialization utility
- All inbound mutations trigger the hooks bridge automatically (since they use standard DOM APIs), which in turn triggers style recomputation and re-rendering — no manual event emission needed
- Integration tests verify the round-trip: DevTools sends mutation → DOM updates → hooks fire → styles recompute → terminal re-renders → CDP mutation event echoes back to DevTools

**Dependencies**

- M8T4: DOM domain tree inspection (the domain being extended)
- M8T5: DOM domain live mutations (the echo path that confirms changes)

---

### M8T7: CSS domain — style inspection

**Summary**

Implement the CSS domain methods that populate DevTools' Styles pane. This is where terminal-dom's real style engine shines — instead of stubbing with inline styles only, we return actual matched CSS rules with selectors, specificity ordering, and real computed values from the cascade.

**Expected Outcomes**

- `CSS.enable` initializes the domain
- `CSS.getMatchedStylesForNode` returns:
  - `inlineStyle` — properties from `element.style` with property names, values, and range information
  - `matchedCSSRules` — actual rules matched by the `SelectorMatcher`, each with: the selector text, the source stylesheet ID, declarations with property names and values, and specificity. Rules are sorted by specificity (matching DevTools' display order: lowest specificity first, highest last)
  - `inherited` — inherited style entries from ancestor elements, showing which ancestor contributed which inherited properties
- `CSS.getComputedStyleForNode` returns all computed style properties from `StyleEngine.getComputedStyle()` as name-value pairs — these are real resolved values, not just what's on `element.style`
- `CSS.getInlineStylesForNode` returns only the inline style properties from `element.style`
- All CSS property entries include a `range` object (`startLine`, `startColumn`, `endLine`, `endColumn`) — required to prevent DevTools from crashing when positioning the edit cursor
- Unit tests verify: matched rules from `<style>` blocks appear with correct selectors and specificity, computed style includes inherited values, inline styles are reported separately

**Technical Constraints**

- Uses `SelectorMatcher.match()` to get matched declarations with specificity
- Uses `StyleEngine.getComputedStyle()` for resolved computed values
- Stylesheet IDs are assigned per `<style>` element to correlate rules back to their source

**Dependencies**

- M8T2: CDP transport (message dispatch)
- M8T3: Node registry (node ID lookup)
- M1T12–M1T16: Style engine (SelectorMatcher, StyleResolver, StyleEngine)

---

### M8T8: CSS domain — stylesheet management and editing

**Summary**

Implement stylesheet tracking and live style editing. DevTools can view the source text of `<style>` blocks and edit styles — both inline and in stylesheets. Edits are applied to the terminal DOM and immediately re-rendered.

**Expected Outcomes**

- Each `<style>` element is assigned a stylesheet ID and tracked
- `CSS.getStyleSheetText` returns the full CSS text content of a `<style>` element by stylesheet ID
- `CSS.setStyleTexts` applies style edits — supports both inline style edits (sets the `style` attribute) and stylesheet rule edits (modifies the `<style>` element's text content and triggers re-parse)
- `CSS.styleSheetAdded` event is emitted when a `<style>` element is inserted into the document
- `CSS.styleSheetRemoved` event is emitted when a `<style>` element is removed
- Style edits trigger the style engine's dirty-marking, re-cascade, relayout, and re-render automatically
- Integration tests verify: edit an inline style in DevTools → terminal re-renders with new style; edit a rule in a `<style>` block → affected elements update

**Dependencies**

- M8T7: CSS domain style inspection (the domain being extended)
- M8T5: DOM domain live mutations (tracks `<style>` element insertions/removals via hooks)
- M1T11: `<style>` element handling (source text tracking)

---

### M8T9: Runtime domain — evaluation and object inspection

**Summary**

Implement the Runtime domain for console evaluation and object property inspection. This powers DevTools' Console panel and the Properties sidebar. Evaluation runs in a scope that provides `$0` (inspected node), `window`, `document`, and the `Terminal` instance.

**Expected Outcomes**

- An `ObjectRegistry` class exists in `src/devtools/classes/` — bidirectional mapping between JS objects and string IDs, with support for `releaseObject` cleanup
- `Runtime.enable` initializes the domain
- `Runtime.evaluate` evaluates expressions in a scope with `$0`, `window`, `document`, and `terminal` — returns a `RemoteObject` describing the result
- `RemoteObject` serialization handles: primitives (`string`, `number`, `boolean`, `undefined`), `null`, DOM nodes (`subtype: "node"` with description), arrays, plain objects, errors, and functions
- `Runtime.getProperties` returns own and inherited properties of an object by its registry ID — each property includes name, value (as `RemoteObject`), writable, configurable, enumerable
- `Runtime.callFunctionOn` calls a function with a given `this` object and arguments, returns the result
- `Runtime.releaseObject` and `Runtime.releaseObjectGroup` clean up registry entries to prevent memory leaks
- Error handling: evaluation errors return `exceptionDetails` with the exception as a `RemoteObject`
- Unit tests cover: primitive evaluation, DOM node evaluation, `$0` access, property expansion, function calls, error handling, and object cleanup

**Dependencies**

- M8T2: CDP transport (message dispatch)
- M8T4: DOM domain tree inspection (`DOM.setInspectedNode` provides `$0`)

---

### M8T10: Overlay domain — element highlighting

**Summary**

When a developer hovers over an element in DevTools' Elements panel, Chrome sends `Overlay.highlightNode` to request a visual highlight. Implement this by rendering a box-model overlay directly in the terminal — showing the content, padding, border, and margin regions of the highlighted element using color overlays or visual indicators.

**Expected Outcomes**

- `Overlay.enable` initializes the domain
- `Overlay.highlightNode` accepts a node ID and a highlight configuration (content color, padding color, border color, margin color) and renders a visual overlay on the element's layout box in the terminal
- The overlay uses the layout engine's box positions to determine exact cell locations for content, padding, border, and margin regions
- Each region is rendered with a distinct visual treatment (e.g., colored background cells, inverted colors, or translucent color blending with existing content)
- `Overlay.hideHighlight` removes the overlay and restores normal rendering
- `Overlay.setInspectMode` enables inspect mode — mouse movement in the terminal highlights the element under the cursor and reports it to DevTools via `Overlay.nodeHighlightRequested`
- Overlay rendering does not modify the DOM or style engine state — it is painted as a post-processing pass over the cell buffer
- Unit tests verify: correct cell positions for overlay regions, overlay appears/disappears on highlight/hide, inspect mode hit-tests correctly

**Dependencies**

- M8T2: CDP transport (message dispatch)
- M8T3: Node registry (node ID → element → layout box lookup)
- M1T20: Layout engine (provides box positions and dimensions)
- M1T22: Painter / M1T25: Renderer (overlay rendering pass)

---

### M8T11: Performance domain

**Summary**

Bridge the Performance domain to terminal-dom's `window.performance` API from Milestone 7. DevTools can query current metrics and observe performance entries, giving developers access to frame timing, FCP, LCP, and INP data in the familiar DevTools Performance panel.

**Expected Outcomes**

- `Performance.enable` initializes the domain and starts forwarding entries
- `Performance.getMetrics` returns current metric values derived from `window.performance` entries: frame count, average frame duration, FCP time, LCP time, dropped frame count, and any `PerformanceMark` entries
- `Performance.disable` stops forwarding
- Performance entries recorded via `window.performance` (frame measures, paint timing, event timing) are forwarded to DevTools as `Performance.metrics` events
- `Tracing.start` / `Tracing.end` capture a recording window — all `PerformanceObserver` entries during the window are collected and sent as `Tracing.dataCollected` events in the format DevTools expects for its timeline view
- Unit tests verify: metric retrieval, entry forwarding, and tracing window capture

**Dependencies**

- M8T2: CDP transport (message dispatch)
- M7T2: Performance class (`window.performance`)
- M7T3: PerformanceObserver (entry subscription)
- M7T7: Frame cycle instrumentation (produces frame measures)
- M7T8: Input dispatch instrumentation (produces event timing entries)

---

### M8T12: Log domain — console forwarding

**Summary**

Forward console output to DevTools' Console panel. When the terminal application calls `console.log`, `console.warn`, `console.error`, or `console.info`, the output appears in DevTools alongside evaluated expressions from the Runtime domain.

**Expected Outcomes**

- `Log.enable` initializes the domain and begins intercepting console methods
- `console.log` → `Log.entryAdded` event with `level: "info"`, serialized arguments as `RemoteObject` values, and a timestamp
- `console.warn` → `Log.entryAdded` with `level: "warning"`
- `console.error` → `Log.entryAdded` with `level: "error"`
- `console.info` → `Log.entryAdded` with `level: "info"`
- `Log.disable` stops interception and restores original console methods
- Console interception is non-destructive — original console output to stdout/stderr is preserved (messages are tee'd, not redirected)
- `Runtime.consoleAPICalled` events are also emitted for console calls (DevTools uses this in addition to `Log.entryAdded`)
- Unit tests verify: each log level maps correctly, arguments are serialized, original console behavior is preserved, and interception starts/stops cleanly

**Dependencies**

- M8T2: CDP transport (event emission)
- M8T9: Runtime domain (RemoteObject serialization, `Runtime.consoleAPICalled` event)

---

### M8T13: DevToolsBridge orchestrator and Terminal integration

**Summary**

Implement the top-level `DevToolsBridge` class that wires all CDP domains together and integrates with the `Terminal` class. This is the public API for enabling DevTools debugging. It coordinates domain initialization, lifecycle management, and provides the opt-in entry point.

**Expected Outcomes**

- A `DevToolsBridge` class exists in `src/devtools/classes/` — accepts a `Terminal` instance, creates the transport, initializes all domain handlers, and manages the bridge lifecycle
- `listen(port?)` starts the CDP server (default port 9222) and logs the DevTools connection URL
- `close()` shuts down the server, disconnects all clients, cleans up registries, and restores intercepted console methods
- When a DevTools client connects, all domains are initialized with the terminal's current state (document tree, stylesheets, performance entries)
- When a DevTools client disconnects, registries are cleaned up to prevent memory leaks
- Terminal integration via constructor option: `new Terminal({ devtools: true })` or `new Terminal({ devtools: { port: 9333 } })` automatically creates and starts the bridge
- Separate import path for explicit control: `import { DevToolsBridge } from '@micra/terminal-dom/devtools'`
- The `src/devtools/index.ts` barrel exports `DevToolsBridge` and relevant types
- Integration tests verify: full round-trip from Terminal creation with DevTools enabled → WebSocket connection → DOM inspection → style inspection → console evaluation → element highlighting → performance metrics

**Dependencies**

- M8T1–M8T12: All transport, domain, and registry implementations
- M1T29: Terminal class (the integration target)

---
