# Web APIs — The Handler Pattern

## The gap between shape and substance

A DOM polyfill gives frameworks the tree they need — elements, attributes, events, mutations. But real applications reach beyond the tree. They read the clipboard. They fire notifications. They check the URL. They query the color scheme. These aren't tree operations — they're calls to the platform.

In a browser, the platform is always present. `navigator.clipboard.readText()` talks to the OS clipboard. `new Notification(title)` triggers the system notification center. The API and the implementation are fused together.

@cliui/dom separates them. It provides the API shape — the classes, the methods, the return types — but leaves the implementation to the environment. A terminal environment wires clipboard reads to an in-memory buffer and OSC 52 sequences. A test environment wires them to a mock. A remote display wires them to a message channel. The application code doesn't change.

This is the same principle behind the [two-layer architecture](./what-is-cliui-dom.md#two-layers-state-and-rendering): the DOM provides state and surface, the environment provides meaning. For tree mutations, the connection is the hooks bridge. For these leaf-level APIs, the connection is **handlers** — static properties, instance callbacks, or managed methods that environment layers wire up to provide platform-specific behavior.

The distinction matters — and it's worth understanding precisely, because hooks and handlers are @cliui/dom's two extension surfaces. They solve different problems with different mechanics:

| Dimension        | Hooks bridge                                  | Handlers                                                                    |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| **Direction**    | DOM → renderer (outbound observation)         | Application ↔ platform (bridging action)                                    |
| **Frequency**    | Continuous, per-mutation                      | Discrete, per-call or per-construction                                      |
| **Timing**       | Synchronous, in the mutation's call stack     | Synchronous invocation, sometimes async resolution                          |
| **Scope**        | One shared `HOOKS` object per Window          | Static class properties or instance callbacks                               |
| **Failure mode** | Silent — unobserved mutations aren't observed | Safe defaults — unwired reads return `''`, unwired notifications are no-ops |

Hooks observe the tree. Handlers act on the platform. If you're building a renderer, you need hooks. If you're connecting platform capabilities (clipboard, notifications, URL reporting, color scheme), you need handlers. If you're building a complete environment, you need both.

And when no handler is wired? Nothing breaks. Clipboard reads return empty strings. Notifications fire silently. Location parses URLs but doesn't navigate. The API surface is safe to call when handlers are absent — though note that URL parsing is delegated to the built-in `URL` constructor, so invalid URLs still throw regardless of handler state.

This document covers the five APIs that use the handler pattern: Clipboard, Notification, Location, MediaQueryList, and Navigator. Other browser-facing APIs on Window — `requestAnimationFrame()`, `requestIdleCallback()`, `alert()`, `confirm()`, `prompt()` — use different mechanisms (timer shims, `<dialog>` construction) and are documented in [Scope and Boundaries](./scope-and-boundaries.md).

Application code can call these APIs without checking whether handlers are wired — when handlers are absent, the DOM supplies safe defaults. When handlers are present, they execute synchronously and their exceptions propagate normally; the DOM does not sandbox handler invocations. This document is primarily for environment builders who need to wire the platform behavior underneath.

## Three ways to wire an environment

Each API uses a different handler mechanism, chosen to match how the underlying resource works in the real world. The philosophy is shared — DOM provides shape, environment provides implementation — but the wiring varies because the resources vary.

| API            | Mechanism                       | Scope                                   | Handler types                                   |
| -------------- | ------------------------------- | --------------------------------------- | ----------------------------------------------- |
| Clipboard      | Static class properties         | All instances share one handler         | `ClipboardWriteHandler`, `ClipboardReadHandler` |
| Notification   | Static class property           | All instances share one handler         | `NotificationHandler`                           |
| Location       | Instance callback               | Per-instance                            | `((pathname: string) => void) \| null`          |
| MediaQueryList | Instance method, Window-managed | Window tracks and updates all instances | `update(newMatches: boolean)`                   |
| Navigator      | No handler — static data bag    | Per-instance                            | None                                            |

The pattern behind the choice: **system-level resources get static handlers** (one clipboard, one notification system), **per-instance resources get instance callbacks** (each Window has its own Location), and **passive state gets no handler at all** (Navigator just holds data).

The named handler types — `ClipboardWriteHandler`, `ClipboardReadHandler`, and `NotificationHandler` — are exported from `@cliui/dom` for environment builders to import.

## Clipboard

Clipboard and Notification are both system-level resources — one clipboard per environment, one notification system. Both use **static handlers on the class**, set once and shared by every instance. Clipboard is the simpler of the two.

Every `navigator.clipboard` instance routes through the same read/write implementation. Two static properties — `Clipboard.writeHandler` and `Clipboard.readHandler` — connect all instances to the platform.

```ts
import {Clipboard} from '@cliui/dom';
import type {ClipboardWriteHandler, ClipboardReadHandler} from '@cliui/dom';

let buffer = '';

const writeHandler: ClipboardWriteHandler = (text) => {
  buffer = text;
  // emit OSC 52 or platform-specific write sequence
};

const readHandler: ClipboardReadHandler = () => {
  return buffer;
};

Clipboard.writeHandler = writeHandler;
Clipboard.readHandler = readHandler;
```

The most important thing to understand about this design: **the DOM-layer Clipboard is stateless.** It has no internal buffer. There is no implicit "last written value" fallback. If you call `writeText('hello')` and then `readText()`, the read returns `''` unless your `readHandler` closure provides its own persistence. The DOM routes the call; the environment decides what "remember" means.

| Detail                       | Behavior                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **When no handler is wired** | `writeText()` silently drops the text. `readText()` returns `''`.                                                                |
| **Handler invocation**       | `writeText(text)` calls `Clipboard.writeHandler?.(text)`. `readText()` calls `Clipboard.readHandler?.()` and falls back to `''`. |
| **Async interface**          | Both methods return `Promise<void>` / `Promise<string>` to match the browser API shape, but resolve synchronously.               |

The statelessness is intentional. A browser clipboard has OS-level persistence — you write once and read from anywhere. @cliui/dom doesn't presume that persistence exists. The handler closure decides what "remember" means: an in-memory variable, a file, a shared buffer between processes. The DOM just routes the call.

## Notification

Notification uses the same static-handler mechanism as Clipboard, but with a different invocation model. Where Clipboard handlers fire on demand (when `readText()` or `writeText()` is called), Notification's handler fires at **construction time** — the constructor itself is the side effect.

```ts
import {Notification} from '@cliui/dom';
import type {NotificationHandler} from '@cliui/dom';

const handler: NotificationHandler = (title, body) => {
  // emit OSC 9, OSC 777, BEL, or platform-specific notification
};

Notification.handler = handler;
```

| Detail                       | Behavior                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **When no handler is wired** | Construction completes normally. No platform notification fires. The `show` event still dispatches asynchronously.                                                                                                                                                                                                                      |
| **Handler invocation**       | The constructor calls `Notification.handler?.(this.title, this.body)` synchronously, before the `show` event. If the handler throws, the exception propagates from the constructor and the `show` event will not dispatch.                                                                                                              |
| **Permission**               | `Notification.permission` is always `'granted'`. `requestPermission()` returns `Promise.resolve('granted')`. Terminal applications don't prompt for permission.                                                                                                                                                                         |
| **Events**                   | `show` dispatches asynchronously via `queueMicrotask` (matching browser behavior). `close` dispatches synchronously when `close()` is called. Both `addEventListener` and legacy `onshow`/`onclose` handlers work.                                                                                                                      |
| **API shape stubs**          | The constructor also accepts `icon` and `tag` options, which are stored on the instance for API compatibility but have no terminal behavior — `icon` is meaningless without a visual surface, and `tag` is not forwarded to the handler. The `onclick` and `onerror` legacy event handlers are declared but never internally triggered. |
| **Transient notifications**  | `close()` dispatches the event but doesn't dismiss anything — terminal notifications are transient and managed by the OS/emulator.                                                                                                                                                                                                      |

The always-granted permission model reflects a design reality: terminal applications have no permission dialog. The environment that created the DOM already decided notifications are allowed by wiring a handler — or decided they aren't by leaving it null. There's no user to prompt.

Notification extends `EventTarget`, so the full event listener API is available.

## Location

Clipboard and Notification are system-level resources with static handlers. Location breaks from that pattern because it breaks from the singleton pattern. Unlike Clipboard and Notification, Location isn't a global resource — each Window creates its own instance. When multiple Window instances coexist (tests, multi-pane layouts), each needs independent URL state and independent wiring.

That's why Location uses an **instance callback** — a public property on each Location instance.

```ts
const location = new Location('about:blank');

location.onPathnameChange = (pathname) => {
  // emit OSC 7 or platform-specific working directory report
};

location.href = 'file:///Users/me/project';
// onPathnameChange fires with '/Users/me/project'
```

| Detail                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **When no callback is wired** | URL parsing works. Setters update the internal `URL` instance. No side effects.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Callback invocation**       | The `pathname` setter always calls `onPathnameChange(value)` with the raw input string — even when set to the current value (no delta detection). The `href` setter calls `onPathnameChange(this.#url.pathname)` only when the pathname actually changed (delta detection, normalized value). Note the asymmetry: `pathname` emits the raw input, `href` emits the URL-normalized stored pathname. Since `assign()` and `replace()` delegate to the `href` setter, they inherit its delta detection and normalization behavior. Other setters (`protocol`, `hostname`, `host`, `port`, `search`, `hash`) don't trigger the callback. |
| **No navigation**             | `assign()` and `replace()` both just set `this.href`. `reload()` is a no-op. There is no history stack, no popstate events. See [Scope and Boundaries](./scope-and-boundaries.md) for the full picture.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **URL parsing**               | Delegated entirely to the built-in `URL` constructor. All standard URL components are available as getters and setters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

The delta detection on `href` is a small but important detail. Setting `location.href` to a URL with the same pathname but a different query string doesn't fire `onPathnameChange`. Only actual pathname changes trigger the callback. This prevents spurious notifications when query parameters or hash fragments change — the environment cares about "where am I?" not "what are my parameters?"

## MediaQueryList

Location uses instance callbacks for per-Window resources. MediaQueryList introduces a different pattern: an **instance method managed by Window**. The MediaQueryList itself is passive — it stores state and dispatches events. The coordination logic lives in Window, which tracks all instances and pushes updates to them.

This indirection exists because media queries are reactive. A clipboard read is a one-shot call — you ask and get an answer. A media query is a standing question: "does this condition match right now?" The answer changes over time, and every interested party needs to hear about it. Window owns that broadcast.

### How it works

1. `window.matchMedia(query)` creates a new `MediaQueryList`, evaluates the query against the current color scheme, and pushes the instance into an internal tracking array.
2. `window.setColorScheme(scheme)` iterates all tracked instances and calls `mql.update(newMatches)` on each.
3. `update()` compares old and new state, updates `matches`, and dispatches a `MediaQueryListEvent` if the value changed.

```ts
const mql = window.matchMedia('(prefers-color-scheme: dark)');
console.log(mql.matches); // true (default color scheme is 'dark')

mql.addEventListener('change', (event) => {
  console.log('Dark mode:', event.matches);
});

// Environment layer detects a color scheme change:
window.setColorScheme('light');
// 'change' event fires on mql with matches: false
```

| Detail                   | Behavior                                                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supported queries**    | `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)`. Queries are normalized (whitespace collapsed, lowercased) for evaluation, but the original string is preserved in `mql.media`. Everything else returns `matches: false`. |
| **Default color scheme** | `'dark'`.                                                                                                                                                                                                                                    |
| **Event type**           | Changes dispatch a `MediaQueryListEvent` with `matches` and `media` properties. Both `addEventListener` and legacy `onchange` work. Both `MediaQueryList` and `MediaQueryListEvent` are exported from `@cliui/dom`.                          |
| **No-change guard**      | `update()` is a no-op when the new value matches the old. `setColorScheme()` is a no-op when the scheme hasn't changed.                                                                                                                      |
| **Instance retention**   | Window retains a reference to every `MediaQueryList` created via `matchMedia()`. Instances are never removed from the internal tracking array. In long-running applications with frequent `matchMedia` calls, stale instances accumulate.    |

### The Window relationship

`setColorScheme()` is a DOM-layer API on Window. It exists for environment layers to call when the detected color scheme changes — the DOM provides the mechanism, but environments must call `setColorScheme()` to activate it. Without that call, all MediaQueryList instances retain their initial state. `getColorScheme()` returns the current value.

## Navigator

The final API in the spectrum uses no handler at all. Navigator is a **static data bag** — terminal-appropriate defaults with one dynamic composition point.

| Property              | Value                                        |
| --------------------- | -------------------------------------------- |
| `userAgent`           | `TerminalDOM/{version} (terminal)`           |
| `language`            | `'en-US'`                                    |
| `languages`           | `['en-US', 'en']`                            |
| `onLine`              | `true`                                       |
| `hardwareConcurrency` | `1`                                          |
| `cookieEnabled`       | `false`                                      |
| `clipboard`           | `new Clipboard()` — inherits static handlers |
| `permissions`         | `null`                                       |
| `geolocation`         | `null`                                       |
| `appCodeName`         | `'Mozilla'`                                  |
| `appName`             | `'Netscape'`                                 |
| `appVersion`          | derived from `userAgent` (after `/`)         |
| `platform`            | `''` (empty string)                          |
| `product`             | `'Gecko'`                                    |
| `productSub`          | `'20100101'`                                 |
| `vendor`              | `''`                                         |
| `vendorSub`           | `''`                                         |
| `maxTouchPoints`      | `0`                                          |
| `webdriver`           | `false`                                      |
| `doNotTrack`          | `'unspecified'`                              |

The composition point is `clipboard`. Each Navigator instance creates its own `Clipboard`, but because Clipboard's handlers are static, all instances share the same read/write implementation. Wire handlers once on the class, and every `navigator.clipboard` works. This is the payoff of the static-handler design — a single wiring point propagates through every access path.

`permissions` and `geolocation` return `null` — explicit stub boundaries rather than incomplete implementations. The absence says "this isn't available" rather than "this is partially available and might mislead you."

## Why handlers leak and how to stop it

Static handlers are global state. They live on the class, not on any instance, which means they persist across environment lifecycles. In a single long-running application, that's fine — you wire once at startup and forget about it. But in environments with start/stop cycles (tests, hot-reloading, multi-tenant processes), a stopped environment's handlers stay wired and keep receiving calls from the next environment's DOM operations.

The fix is explicit teardown:

```ts
function stop() {
  Clipboard.writeHandler = null;
  Clipboard.readHandler = null;
  Notification.handler = null;
  window.location.onPathnameChange = null;
}
```

This is the trade-off of the static-handler design: simplicity of wiring comes at the cost of manual cleanup. Instance-scoped handlers (like Location's) die with their instance. Class-scoped handlers (Clipboard, Notification) outlive everything unless you null them.

The scope distinction matters in multi-Window scenarios too. Static handlers mean all Windows share one clipboard and one notification route. This is usually correct — there's one physical clipboard, one notification system. But if you need per-Window isolation (for example, in tests that create independent environments), the static design doesn't support it. Location and MediaQueryList are per-Window by design; Clipboard and Notification are per-process by design.

## Wiring it all together

A complete environment wires all handlers at startup. Here's the shape of what that looks like:

```ts
import {Clipboard, Notification} from '@cliui/dom';
import type {Window} from '@cliui/dom';
import type {ClipboardWriteHandler, ClipboardReadHandler, NotificationHandler} from '@cliui/dom';

function start(window: Window) {
  // Clipboard — static handlers
  let buffer = '';
  Clipboard.writeHandler = (text) => {
    buffer = text; /* emit to platform */
  };
  Clipboard.readHandler = () => buffer;

  // Notification — static handler
  Notification.handler = (title, body) => {
    /* emit to platform */
  };

  // Location — instance callback
  window.location.href = 'file:///initial/path';
  window.location.onPathnameChange = (pathname) => {
    /* report to platform */
  };

  // MediaQueryList — call setColorScheme when your platform detects a change
  window.setColorScheme('dark');
}

function stop(window: Window) {
  Clipboard.writeHandler = null;
  Clipboard.readHandler = null;
  Notification.handler = null;
  window.location.onPathnameChange = null;
}
```

The `examples/web-api-bridge/` example project demonstrates all of these APIs wired into a running application.

## The larger pattern

The handler pattern is a general-purpose technique for extending a DOM polyfill with platform-specific behavior without coupling the DOM to any specific platform. The design rule is simple: look at the underlying resource's scope, and match the handler mechanism to it. System-level resources get static handlers. Per-Window resources get instance callbacks. Reactive state gets managed coordination. Passive data gets no handler at all.

The hooks bridge and the handler pattern together cover @cliui/dom's two extension surfaces. Hooks let renderers observe the tree. Handlers let environments act on the platform. If you're building a complete environment on @cliui/dom, you've now seen the full vocabulary for both.

## Where to go next

- **[What Is @cliui/dom?](./what-is-cliui-dom.md)** — the two-layer architecture that motivates the handler pattern
- **[Scope and Boundaries](./scope-and-boundaries.md)** — what's not supported in these APIs and why, plus `polyfillEnvironment()` for installing globals
- **[The Hooks Bridge](./hooks-bridge.md)** — the other extension surface, for tree-level mutation observation
