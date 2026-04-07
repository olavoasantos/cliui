# RFC: `@cliui/test` — E2E & Component Testing for Terminal Applications

## Vision

Terminal UI testing today is stuck between two unsatisfying extremes. On one side, PTY-based harnesses (expect, pexpect, teatest) scrape raw character buffers with regex patterns — fragile, impossible to debug, and blind to the structure of the UI. On the other, web E2E tools like Playwright and Cypress offer extraordinary developer experience — semantic queries, auto-waiting, trace viewers, visual diffing — but only for browser-based UIs.

`@cliui/test` bridges this gap. The `@cliui/terminal` framework occupies a unique architectural position: it renders terminal UIs through a **real DOM polyfill** (`@cliui/dom`) with full `Window`, `Document`, `Element`, `MutationObserver`, `querySelector`, events, and CSS support. It also ships a **Chrome DevTools Protocol (CDP) bridge** (`@cliui/devtools`) that exposes the DOM, CSS, Runtime, Performance, and other domains over WebSocket — the same protocol that powers Playwright and Puppeteer.

`@cliui/test` leverages both of these to provide Playwright-grade testing DX for terminal applications: semantic DOM queries, auto-waiting tied to the render cycle, cell buffer visual diffing, layout regression testing, deterministic replay, trace files, and more — all composable with existing test runners like Vitest and Jest.

---

## Target Audience

### Framework Maintainer

The primary and most demanding user is the `@cliui/terminal` framework author. The framework currently lacks a robust way to write E2E tests, leading to excessive manual testing, brittle mocks, and wasted time. `@cliui/test` provides the infrastructure to test the framework itself — layout computation, focus management, element rendering, CSS resolution, and cross-environment behavior — preventing regressions and enabling confident iteration.

### Application Developers

Developers building applications on `@cliui/terminal` need to verify that their forms submit correctly, their lists scroll, their dialogs appear on the right keypress, and their layouts adapt to different terminal sizes. `@cliui/test` gives them a familiar, high-quality testing API without requiring them to learn terminal-specific testing patterns or build custom harnesses.

---

## Core Concept

`@cliui/test` is an **automation library**, not a test runner. It provides:

- A **launcher** that spawns the terminal app in an isolated process
- A **CDP client** that connects to the app's devtools bridge
- A **page-level API** (`querySelector`, `click`, `type`, `waitForSelector`, `screenshot`, etc.)
- A **plugin system** for extensibility (accessibility, performance, chaos testing)
- Integration helpers for **Vitest** (fixtures, custom matchers, reporters)

The test runner (Vitest/Jest) owns execution, assertions, and lifecycle. `@cliui/test` owns automation — launching, connecting, driving, observing, and capturing.

### API Layering

The API is structured in three layers. Developers spend most of their time in the mid-level Page API, but can drop to raw CDP when needed and rise to high-level helpers for common patterns.

| Layer | Purpose | Audience |
|-------|---------|----------|
| **Protocol** | Thin CDP client: `session.send('DOM.getDocument')` | Power users, edge cases, escape hatch |
| **Page API** | `querySelector`, `click`, `type`, `waitForSelector`, `screenshot` | Primary workhorse — most tests live here |
| **High-level helpers** | Composite actions, component-aware utilities, semantic queries | Convenience, readability, common patterns |

### Scoping

`@cliui/test` is scoped to `@cliui/terminal` applications. It does not attempt to test arbitrary terminal programs (ncurses, Ink, Blessed, etc.). However, the architecture is modular — launcher, transport, and API layers are separate concerns — so the door remains open for future expansion.

---

## Package Architecture

```
@cliui/test                  — Core: launcher, CDP client, Page API, plugin system
@cliui/test/component        — Component testing: mount API, direct transport
@cliui/test/trace            — Recording, trace files, trace viewer
@cliui/test/vitest           — Vitest fixtures, custom matchers, reporter

@cliui/test-a11y             — Plugin: accessibility auditing
@cliui/test-perf             — Plugin: performance assertions & budgets
@cliui/test-chaos            — Plugin: fuzz / chaos testing

@cliui/stories               — Separate tool: component isolation playground
```

Each package has a clear boundary. The core `@cliui/test` has no dependency on any test runner. Vitest integration is a separate entry point. Plugins are separate packages that implement a standard interface. The component playground (`@cliui/stories`) is a standalone tool that shares the mount primitives with `@cliui/test/component`.

---

## Detailed Design

### 1. Core Automation Engine

#### CDP Client

A thin, typed WebSocket client that speaks the CDP wire protocol. It connects to the devtools bridge's WebSocket endpoint, sends commands, and receives responses and events.

```ts
const client = new CDPClient('ws://127.0.0.1:9222/devtools/terminal-dom');
await client.connect();

const { root } = await client.send('DOM.getDocument');

client.on('DOM.documentUpdated', () => { /* ... */ });

await client.disconnect();
```

The client is fully typed for all CDP domains the devtools bridge implements (DOM, CSS, Runtime, Performance, Overlay, etc.), plus terminal-specific extensions. A generic `send(method: string, params?: object)` method provides untyped access for custom or new domains.

The client does not auto-reconnect. Tests should fail fast on connection loss, not silently retry.

#### Launcher

The launcher spawns the application under test and gets it to a "connectable" state.

```ts
const process = await launch('./my-app.ts', {
  runtime: 'node',
  args: ['--some-flag'],
  env: { MY_VAR: 'value' },
  terminalSize: { cols: 80, rows: 24 },
  devtools: { port: 9222 },
  headless: true,
});

// process.cdpUrl → 'ws://127.0.0.1:9222/devtools/terminal-dom'
await process.kill();
```

**Zero-config devtools injection.** The launcher detects whether the app already loads the devtools plugin. If not, it injects the plugin automatically — using Node's `--import` flag (ESM) or `--require` (CJS) to preload a setup script that patches the `Terminal` constructor's plugin list. This means application code needs no test-specific configuration.

**Port management.** Ports are auto-assigned from an available range to avoid collisions when Vitest runs tests in parallel. Each test gets its own launcher and CDP port.

**Readiness detection.** The launcher polls the CDP HTTP discovery endpoint (`GET /json/list`) until it responds, using the same mechanism Chrome DevTools uses. Simple and reliable.

**Launcher strategies.** The launcher delegates to a pluggable strategy interface:

```ts
interface LauncherStrategy {
  spawn(config: LaunchConfig): Promise<ProcessHandle>;
  kill(handle: ProcessHandle): Promise<void>;
}
```

Day 1 ships `NodeChildProcessLauncher`. Future strategies include `BunLauncher`, `DenoLauncher`, `DockerLauncher`, and `SSHLauncher` — enabling the same tests to run across runtimes, operating systems, and environments without changing test code.

#### TerminalApp — the Page API

The primary API surface that developers interact with. Wraps the CDP client with high-level methods for querying, interacting, reading state, and capturing output.

```ts
const app = await launch('./my-app.ts');

// ── Querying ──
const el = await app.querySelector('#submit');
const els = await app.querySelectorAll('.item');
const el = await app.waitForSelector('.success', { timeout: 5000 });

// Semantic queries (Testing Library-style)
const button = await app.getByRole('button', { name: 'Submit' });
const greeting = await app.getByText('Welcome back');
const input = await app.getByLabel('Username');

// ── Interaction ──
await el.click();
await el.type('hello world');
await el.press('Enter');
await el.focus();

await app.keyboard.press('Tab');
await app.keyboard.type('search query');
await app.keyboard.shortcut('Ctrl+C');

// ── Reading State ──
const text = await el.textContent();
const html = await el.innerHTML();
const value = await el.getAttribute('data-state');
const styles = await el.computedStyle();
const box = await el.boundingBox();
const visible = await el.isVisible();
const focused = await el.isFocused();

// ── Terminal-Specific ──
const buffer = await app.cellBuffer();
const screenshot = await app.screenshot();
const layout = await app.layoutSnapshot();
await app.resize(120, 40);
await app.waitForPaint();

// ── Evaluation ──
const count = await app.evaluate(() => {
  return document.querySelectorAll('.item').length;
});

// ── Waiting ──
await app.waitForSelector('.loaded');
await app.waitForFunction(() =>
  document.querySelector('.count')?.textContent === '5'
);
await app.waitForEvent('custom-event');

// ── Raw CDP (escape hatch) ──
const session = app.cdpSession;
const { result } = await session.send('Runtime.evaluate', {
  expression: 'globalThis.someInternalState',
});

// ── Lifecycle ──
await app.close();
```

Query methods support both CSS selectors (via `querySelector`/`querySelectorAll`, powered by the DOM's native selector engine) and semantic queries (`getByRole`, `getByText`, `getByLabel`). CSS selectors are the power-user path; semantic queries encourage accessible UI design.

**Auto-waiting.** All interaction methods (`click`, `type`, `press`) automatically wait for the target element to be attached, visible, and stable before acting. This is implemented by hooking into the framework's render cycle — the test knows when layout has settled, not through heuristic timeouts. This eliminates the #1 source of E2E test flakiness.

**`waitForPaint()`.** A terminal-specific primitive that resolves after the next render frame completes. Because the test framework controls the render cycle (via CDP events from the devtools bridge), this is deterministic. No `setTimeout` hacks.

**`TerminalElement` handles.** Methods like `querySelector` return `TerminalElement` instances — lightweight handles that reference a remote DOM node by its CDP node ID. Each method call on a `TerminalElement` issues the corresponding CDP command (`DOM.getAttributes`, `CSS.getComputedStyleForNode`, etc.).

#### Plugin System

The test framework is extensible through a plugin interface:

```ts
const app = await launch('./my-app.ts', {
  plugins: [
    a11yPlugin({ rules: ['focus-order', 'contrast'] }),
    perfPlugin({ budgets: { paint: 16, layout: 8 } }),
    chaosPlugin({ resize: true, inputFlood: true }),
  ],
});
```

Plugin interface:

```ts
interface TestPlugin {
  name: string;

  setup?(app: TerminalApp): Promise<void>;
  teardown?(app: TerminalApp): Promise<void>;

  beforeAction?(action: ActionDescriptor): Promise<void>;
  afterAction?(action: ActionDescriptor): Promise<void>;

  afterTest?(result: TestResult): Promise<void>;

  extend?(app: TerminalApp): Record<string, unknown>;
  matchers?(): Record<string, MatcherFunction>;
  collectArtifacts?(): Promise<Artifact[]>;
}
```

Plugins can intercept every interaction (for recording, chaos injection, performance measurement), extend the `TerminalApp` API with custom methods, provide custom Vitest/Jest matchers, and collect artifacts (traces, reports, screenshots). The plugin manager invokes hooks in registration order.

#### Vitest Integration

First-class Vitest support with fixtures, matchers, and a custom reporter:

```ts
import { test, expect } from '@cliui/test/vitest';

test('shows welcome screen', async ({ app }) => {
  await app.waitForSelector('.welcome');
  const heading = await app.querySelector('h1');
  expect(await heading.textContent()).toBe('Welcome');
});
```

The `test` function wraps Vitest's `test` and injects the `app` fixture, which handles launching and teardown automatically. Configuration lives in a dedicated file:

```ts
// cliui.test.config.ts
import { defineConfig } from '@cliui/test';

export default defineConfig({
  app: './src/main.ts',
  headless: true,
  plugins: [],
  launcher: {
    runtime: 'node',
  },
});
```

**Custom matchers:**

```ts
expect(await app.screenshot()).toMatchCellBuffer();
expect(await app.layoutSnapshot()).toMatchLayout();
expect(el).toHaveText('Submit');
expect(el).toBeVisible();
expect(el).toBeFocused();
```

---

### 2. Visual Verification

#### Cell Buffer Snapshots & Diffing

The cell buffer is a 2D grid where each cell contains a character, foreground color, background color, and text attributes (bold, italic, underline, strikethrough, etc.). This structured data enables rich comparison far beyond pixel-based image diffing.

**Snapshot format.** Cell buffers are serialized to a deterministic, version-control-friendly format suitable for Vitest's snapshot system.

**Diffing algorithm.** Comparison is cell-by-cell across content, colors, and attributes. Changes are classified (content-only, color-only, attribute-only, fully changed) and reported with coordinates: `"Row 5, Col 12-18: content changed from 'Submit' to 'Cancel'"`. Visual diff images highlight changed cells with color overlays.

```ts
expect(await app.screenshot()).toMatchCellBuffer();

const diff = await app.diffCellBuffer(previousBuffer);
// diff.changes → [{ row, col, was, now, type }]
// diff.summary → "4 cells changed across 2 rows"
```

#### Layout Regression Testing

The full layout tree — every element's computed `{ x, y, width, height, contentX, contentY, contentWidth, contentHeight }` — is serialized as a JSON structure mirroring the DOM hierarchy.

Diffing reports semantic changes: `"Element #sidebar width changed: 20 → 18"`, `"Element .footer moved: y 22 → 23"`, `"New element div.notification appeared at (5, 10)"`. This is dramatically more actionable than pixel diffs for debugging layout regressions.

```ts
expect(await app.layoutSnapshot()).toMatchLayout();
```

#### Golden Renders

Version-controlled reference outputs for visual regression testing:

1. Run tests with `--update-goldens` to capture current cell buffers / screenshots as golden references
2. Subsequent runs compare against the goldens
3. On failure, produce a diff report and side-by-side comparison
4. Goldens are committed to version control

The existing `renderCellBufferToImage` utility in `@cliui/devtools` is reused for PNG golden files.

---

### 3. Component Testing

#### Direct Transport

For component tests, a `DirectAdapter` replaces the CDP WebSocket transport. It routes calls directly to the devtools domain handler methods in-process — no serialization, no network, no latency.

```
E2E:        TerminalApp → CDPClient → WebSocket → CDPTransport → DomainHandler → DOM
Component:  TerminalApp → DirectAdapter → DomainHandler → DOM
```

The same `TerminalApp` API works identically across both transports. Tests use the same queries, interactions, and assertions regardless of mode.

#### Mount API

Mount individual components in a minimal terminal context for fast, isolated testing:

```ts
import { mount } from '@cliui/test/component';

// By class (auto-registers if needed, type-safe)
const ctx = await mount(Button, { attributes: { label: 'Submit' } });

// By tag name (must be registered in CustomElementRegistry)
const ctx = await mount('my-button', { attributes: { label: 'Submit' } });

// Same API as TerminalApp
const button = await ctx.querySelector('my-button');
await button.press('Enter');
expect(await button.getAttribute('aria-pressed')).toBe('true');
expect(await ctx.screenshot()).toMatchCellBuffer();

await ctx.unmount();
```

Under the hood, `mount()` creates a fresh `Window` and `Document` from `@cliui/dom`, sets up the `StyleEngine`, `LayoutEngine`, and `Renderer` (headless), optionally registers the element class in the `CustomElementRegistry`, appends the element to the document body, runs layout and paint, and returns a `TerminalApp`-compatible handle via the `DirectAdapter`.

This runs in the test process, same event loop. Tests execute in sub-millisecond time — no spawning, no WebSocket — enabling hundreds of component tests per second.

#### Semantic Queries

In addition to CSS selector queries, semantic queries encourage accessible UI patterns:

```ts
const button = await ctx.getByRole('button', { name: 'Submit' });
const greeting = await ctx.getByText('Welcome back');
const input = await ctx.getByLabel('Username');
```

The terminal UI semantic role taxonomy is an open design area (see Open Questions). The query mechanism is built on DOM attribute inspection, so it will work with whatever role model the framework establishes.

---

### 4. Recording & Tracing

#### DOM Mutation Timeline

During a test run, a recording plugin captures every observable change:

| Event type | Captured data |
|-----------|---------------|
| DOM mutation | Node added/removed/modified, attribute changes, text content changes |
| User input | Key events, mouse events, with target element reference |
| Style recalculation | Which elements were restyled, old and new computed values |
| Layout pass | Duration, which elements were relaid out |
| Paint | Frame number, duration, cell buffer delta from previous frame |
| Custom events | Any events dispatched on the DOM |

Each entry is timestamped relative to test start. Recording uses `MutationObserver` (already in `@cliui/dom`), `PerformanceObserver`, and hooks into the render pipeline via CDP events.

#### Deterministic Replay

Record input sequences and replay them frame-by-frame for perfect reproducibility:

```ts
const recording = await app.startRecording();
// ... interactions ...
const data = await recording.stop();
await data.save('./test-recording.json');
```

```ts
const app = await launch('./my-app.ts');
await app.replay('./test-recording.json');
expect(await app.screenshot()).toMatchCellBuffer('./golden-after-replay.png');
```

Determinism is achievable because the test framework controls both primary sources of UI non-determinism: input timing (the framework sends the inputs) and terminal dimensions (the framework controls resize). Non-determinism in application logic (network, timers) requires mocking, which is the app developer's responsibility.

#### Trace Files

The `.cliui-trace` format bundles everything from a test run into a shareable artifact:

```
my-test.cliui-trace (zip archive)
├── metadata.json           — test name, duration, result, environment info
├── timeline.json           — full mutation timeline
├── inputs.json             — recorded input sequence
├── snapshots/
│   ├── 0000.cellbuffer     — cell buffer at key frames
│   ├── 0042.cellbuffer
│   └── ...
├── dom-snapshots/
│   ├── 0000.json           — serialized DOM tree at key frames
│   └── ...
├── performance.json        — performance metrics
└── screenshots/
    ├── 0000.png            — rendered images at key frames
    └── ...
```

Key frames are captured on interaction, DOM change, and assertion — not every render frame — to keep trace files manageable.

#### Trace Viewer

A standalone tool for exploring `.cliui-trace` files. Initial implementation is web-based (faster to build, richer interactions), with a terminal-native viewer as a future dogfooding showcase.

Features:

- **Timeline scrubber** — drag to any point in time
- **DOM panel** — element tree at the current time point
- **Cell buffer panel** — rendered terminal output at the current time point
- **Diff mode** — compare two time points side by side
- **Event log** — filterable list of all events and mutations
- **Cell-to-element mapping** — click a cell to highlight the DOM element that owns it; click an element to highlight its cells
- **Backward tracing** — select a cell or element, see the mutation history that produced its current state

---

### 5. Developer Experience

#### Interactive Test Recorder (codegen)

```bash
npx cliui-test codegen ./my-app.ts
```

Launches the app with a recording plugin, captures all user interactions, and generates a test file on exit:

```ts
import { test, expect } from '@cliui/test/vitest';

test('recorded test', async ({ app }) => {
  await app.waitForSelector('.welcome');
  await app.keyboard.type('alice');
  await app.keyboard.press('Tab');
  await app.keyboard.type('password123');
  await app.keyboard.press('Enter');
  await app.waitForSelector('.dashboard');
  // TODO: add assertions
});
```

The recorder inserts `waitForSelector` when new elements appear, uses semantic selectors when possible (`#id` > `.class` > positional), collapses rapid keystrokes into `type()` calls, and adds comments where assertions should be added.

#### Watch Mode

Integrates with Vitest's `--watch` mode:

- App source changes → relaunch app, rerun affected tests
- Test file changes → rerun against a fresh app instance
- Optional keep-alive: reuse the app process between runs with a dirty-state flag for faster iteration

#### Test Report TUI

A custom Vitest reporter built with `@cliui/terminal` itself:

- Collapsible test suite tree with pass/fail and durations
- Inline cell buffer diffs on failure
- Keyboard navigation throughout
- Press Enter on a failed test to open its trace
- Real-time progress during execution

#### CI/CD Integration

- JUnit XML output for CI systems
- GitHub Actions annotations (`::error file=...`) for inline failure messages in PR diffs
- Automatic artifact collection: on failure, save `.cliui-trace` files and screenshots
- Test sharding: split the suite across N parallel runners

---

### 6. Scale & Environments

#### Terminal Matrix Testing

Run the test suite across a cartesian product of environment configurations:

```ts
export default defineConfig({
  matrix: {
    runtime: ['node@22', 'bun@1.1'],
    terminalSize: [{ cols: 80, rows: 24 }, { cols: 120, rows: 40 }],
    env: [
      { TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      { TERM: 'xterm', COLORTERM: undefined },
    ],
  },
  launcher: {
    strategy: 'docker',
    images: {
      'node@22': 'node:22-slim',
      'bun@1.1': 'oven/bun:1.1',
    },
  },
});
```

Results are aggregated into a matrix report showing pass/fail per configuration. Tests run in parallel via Docker containers or other launcher strategies.

#### Multi-Instance Testing

Orchestrate multiple app instances for collaborative or multi-pane scenarios:

```ts
const [app1, app2] = await launchMany('./my-app.ts', { count: 2 });

await app1.keyboard.type('hello');
await app2.waitForSelector('.message');
expect(await app2.querySelector('.message')).toHaveText('hello');

await app1.close();
await app2.close();
```

Each instance gets its own process, CDP port, and `TerminalApp` handle.

#### Terminal Emulator Compatibility Suite

A standardized test suite that renders known reference screens and compares actual output across terminal emulators (iTerm2, Kitty, Terminal.app, Windows Terminal). Uses the cell buffer as ground truth and actual terminal capture as the comparand.

---

### 7. Ecosystem & Plugins

#### `@cliui/test-perf` — Performance Plugin

Collects performance metrics from the DOM's `Performance` API (`PerformancePaintTiming`, `LargestContentfulPaint`) and asserts against budgets. Produces performance trend reports.

```ts
expect(app).toMeetPerfBudget({ paint: 16, layout: 8 });
```

#### `@cliui/test-a11y` — Accessibility Plugin

Walks the DOM tree and validates focus order, element labels, and color contrast against the terminal palette. Reports violations with selectors and suggestions.

```ts
expect(app).toBeAccessible();
```

#### `@cliui/test-chaos` — Chaos Testing Plugin

Injects random disruptions between normal test actions — resize events, rapid keystrokes, process signals (SIGTSTP, SIGCONT). Verifies the app doesn't crash or produce corrupt rendering.

```ts
const app = await launch('./my-app.ts', {
  plugins: [chaosPlugin({ resize: true, inputFlood: true, duration: 5000 })],
});
```

#### `@cliui/stories` — Component Isolation Playground

A separate tool for browsing, documenting, and interacting with individual `@cliui/elements` components. Define stories in `.stories.ts` files, browse in a terminal UI, and auto-generate visual regression goldens. Shares the component mount primitives with `@cliui/test/component`.

#### Terminal-Specific CDP Extensions

Because `@cliui/test` controls both sides of the CDP protocol (the server in the devtools bridge and the client in the test library), it can define custom CDP domains for terminal-specific operations:

- `Terminal.getCellBuffer` — raw cell grid data
- `Terminal.resize` — change terminal dimensions
- `Terminal.getLayoutBox` — computed layout for an element
- `Terminal.waitForPaint` — signal after next render frame

These extensions follow CDP conventions and are documented as a specification. Other terminal frameworks could implement the server side to become compatible with `@cliui/test`.

---

## Unique Value Proposition

| Factor | Why it matters |
|--------|---------------|
| **Semantic DOM access** | No other terminal test tool can `querySelector`, inspect computed styles, or walk a real element tree. PTY tools regex against character grids. |
| **Controlling both sides of CDP** | Custom domains, terminal-specific commands, optimized protocol — impossible when only the client side is yours. |
| **Deterministic auto-waiting** | The framework owns the render loop. `waitForPaint()` is tied to the actual render cycle, not a timeout heuristic. This eliminates the primary source of E2E test flakiness. |
| **Cell buffer as structured data** | Visual assertions on actual rendered output — not an image, but a grid with character, color, and attributes per cell. Diffs are semantic, not pixel-based. |
| **Layout tree diffing** | No equivalent exists in web testing. Even Playwright can't structurally diff CSS layout. `@cliui/test` can because the layout engine is internal. |
| **Unified component + E2E API** | Same queries, interactions, and assertions whether testing a single button or a full application. Only the transport changes. |
| **Terminal-native concerns** | Resize handling, color depth, terminal emulator compatibility, cell buffer snapshots — first-class primitives, not afterthoughts. |

---

## Implementation Tiers

The feature set is structured as progressive tiers, each delivering standalone value while building toward the full vision. Each tier depends on the ones before it.

```
Tier 1: Core Engine
  ├─→ Tier 2: Visual Verification
  │     └─→ Tier 5: Developer Experience
  ├─→ Tier 3: Component Testing
  └─→ Tier 4: Recording & Tracing
        └─→ Tier 5: Developer Experience
              └─→ Tier 6: Scale & Environments
                    └─→ Tier 7: Ecosystem & Plugins
```

| Tier | Delivers | Key milestone |
|------|----------|---------------|
| **1. Core Engine** | Working E2E tests: launch, connect, query, interact, assert | "I can write my first test" |
| **2. Visual Verification** | Cell buffer snapshots, layout diffing, golden renders | "I can catch visual regressions" |
| **3. Component Testing** | Fast in-process mount API for isolated element testing | "I can test components without launching an app" |
| **4. Recording & Tracing** | Mutation timeline, deterministic replay, `.cliui-trace` files, trace viewer | "I can debug failed tests like Playwright" |
| **5. Developer Experience** | Codegen, watch mode, TUI reporter, CI integration | "Testing is delightful" |
| **6. Scale & Environments** | Matrix testing, multi-instance, emulator compatibility | "I can test across every configuration" |
| **7. Ecosystem & Plugins** | a11y, perf, chaos plugins; Storybook; protocol standard | "The community can extend this" |

Tier 1 alone is already more capable than any existing terminal testing tool. By Tier 4, the tool matches Playwright's debugging experience. By Tier 7, it establishes a new standard for terminal UI quality assurance.

---

## Open Questions

| Question | Notes |
|----------|-------|
| **Zero-config devtools injection mechanism** | Node's `--import` works for ESM, `--require` for CJS. Bun and Deno have different loader mechanisms. Each runtime needs a specific injection strategy, handled by the launcher strategy abstraction. |
| **Terminal ARIA semantics** | What roles and labels make sense for terminal UI elements? No standard exists. `getByRole` needs a semantic model to be useful. This is a framework-level design question that lives outside `@cliui/test`, but the testing library should be ready for whatever model is established. |
| **Trace file size management** | Recording mutations and cell buffers can produce large traces. Key-frame selection (snapshot on interaction/assertion/DOM change, not every frame) and compression are needed. |
| **Headless rendering fidelity** | In headless mode, the cell buffer should be identical to real terminal output. Edge cases around terminal capabilities (Unicode width, color palette) need validation. |
| **Component mount isolation** | In-process component tests sharing a single event loop risk state leaks. Each `mount()` call creates a fresh `Window` and `Document`, but global state (custom element registrations, shared modules) needs careful teardown. |
| **Parallel test port management** | When Vitest runs N tests in parallel, each needs a unique CDP port. Auto-assignment with a coordination mechanism (port pool or OS-assigned ephemeral ports) prevents collisions. |
| **CDP protocol coverage** | The devtools bridge implements a subset of CDP. Tests may issue commands that aren't yet handled. Strategy: return clear "not implemented" errors for unhandled methods, and extend the bridge as needed. |
| **Cross-runtime devtools parity** | The devtools bridge uses Node-specific APIs (`node:http`, `ws`). Bun and Deno support requires compatible alternatives, addressed per-runtime by the modular architecture. |

---

## Risks & Challenges

| Risk | Mitigation |
|------|------------|
| **Scope creep** | The tiered roadmap enforces progressive delivery. Each tier is a usable product. Don't start Tier N+1 until Tier N is solid. |
| **CDP bridge gaps** | Tests will exercise CDP domains in ways the devtools browser client doesn't. Budget time for expanding domain handler coverage as real test scenarios surface. |
| **Flakiness from timing** | The framework's render-cycle-aware auto-waiting should eliminate most timing issues. Invest heavily in making `waitForPaint()` and `waitForSelector()` bulletproof — they are the foundation of test reliability. |
| **Maintenance burden of multiple launchers** | Start with Node only. Add runtimes based on actual demand. The strategy interface keeps the core clean regardless. |
| **Trace viewer development cost** | A web-based trace viewer is significant UI work. Consider whether Playwright's open-source trace viewer could be adapted, or start with a minimal timeline-only viewer and iterate. |
| **Community adoption** | The framework itself needs adoption before the testing tool matters to external users. However, the testing tool accelerates framework development (the maintainer is the primary user), creating a virtuous cycle. |

---

## Inspirations & References

| Tool | What to borrow |
|------|---------------|
| **Playwright** | Layered API, trace viewer, CDP foundation, auto-waiting, screenshot/video, `codegen` |
| **Cypress** | Time-travel debugging, interactive test replay |
| **Testing Library** | "Test the way users interact" — query by role/label, not implementation details |
| **WebdriverIO / Selenium** | Configurability, multi-environment matrix |
| **Charmbracelet VHS** | Terminal session recording as visual artifacts |
| **Bubble Tea teatest** | Model snapshotting at test checkpoints |
| **expect / pexpect** | The baseline PTY pattern that `@cliui/test` supersedes |
| **Storybook / Chromatic** | Component isolation, visual regression as a service |
| **Netflix Chaos Monkey** | Resilience testing through random disruption |
| **Appium / BrowserStack** | Device farm model for cross-configuration testing |

---

## Next Steps

1. **Tier 1 implementation** — CDP client, launcher (Node), TerminalApp API, plugin system, basic Vitest integration
2. **Dogfood immediately** — write tests for `@cliui/terminal` internals using Tier 1 to validate the API and find gaps
3. **Define terminal CDP extensions** — specify the custom CDP domains (`Terminal.*`) and implement them in the devtools bridge
4. **Tier 2 implementation** — cell buffer snapshots, layout diffing, golden render workflow
5. **Iterate based on real usage** — the framework maintainer is the most demanding user; let real testing pain guide prioritization of subsequent tiers
