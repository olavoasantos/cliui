# Performance API

## Measuring what the browser didn't build

Performance measurement in a browser is easy — the runtime ships with a full Performance API that records navigation timing, paint events, input latency, and resource loading out of the box. In a non-browser environment, none of that infrastructure exists. But the _need_ to measure doesn't go away. A terminal renderer still has a first contentful paint (the first frame that produces visible output). User input still has processing latency. The question is: where does the instrumentation surface live?

@cliui/dom provides a browser-shaped subset of the Performance API — `performance.now()`, `mark()`, `measure()`, `PerformanceObserver` — focused on application-level measurement and renderer-reported paint and input metrics. Instrumentation code written against the standard browser shape works without modification. `performance.now()` delegates directly to Node's `perf_hooks`, giving you high-resolution timing from process start with no abstraction layer between you and the underlying clock.

What makes this more than a thin wrapper is the design decision underneath: the Performance API is a _recording surface_, not a _measurement engine_. It doesn't decide what to measure — it provides the timeline, the observer pipeline, and the entry types so that other layers can record what they know. The rendering layer decides _when_ to record entries like first contentful paint or largest contentful paint. The application decides when to place its own marks and measures. The Performance API stores everything and notifies everyone. This separation will show up in every section that follows.

## Marks and measures

Marks are named timestamps. Measures are named durations between two points. Together, they're the building blocks of any performance timeline — and they're the self-recorded side of the recording surface. The application creates these because only the application knows what's worth timing.

```ts
const perf = window.performance;

// Mark a point in time
perf.mark('init-start');

// ... do work ...

// Mark another point
perf.mark('init-end');

// Measure the duration between them
const m = perf.measure('initialization', {
  start: 'init-start',
  end: 'init-end',
});

console.log(m.duration); // milliseconds between the two marks
```

### mark() options

`mark()` accepts an optional second argument with `startTime` and `detail`. `startTime` overrides the timestamp instead of using `now()` — useful when you need to back-date a mark to an event that happened before you had a chance to record it. `detail` attaches arbitrary metadata so domain context can enter the timeline alongside the timestamp. Returns the created `PerformanceMark`.

```ts
perf.mark('custom', {startTime: 42.5, detail: {reason: 'manual'}});
```

### measure() options

`measure()` resolves `start` and `end` as either timestamps (numbers) or mark names (strings). When a name is given, it finds the most recent mark with that name — if multiple marks share a name, the last one wins, so you can reuse mark names as checkpoints without worrying about collisions.

```ts
// Timestamps directly
perf.measure('phase-a', {start: 10, end: 50});

// Explicit duration (takes precedence over end)
perf.measure('phase-b', {start: 10, duration: 25});

// detail metadata
perf.measure('phase-c', {
  start: 'init-start',
  end: 'init-end',
  detail: {elements: 42},
});
```

If `start` is omitted, it defaults to `now()`. If neither `end` nor `duration` is provided, `end` defaults to `now()`. Referencing a nonexistent mark name throws a `DOMException` with name `'SyntaxError'` — matching browser behavior.

### Querying and clearing

`Performance` provides standard query methods for inspecting the timeline:

- `getEntries()` — all entries, sorted by `startTime`.
- `getEntriesByName(name, type?)` — filter by name, optionally by entry type.
- `getEntriesByType(type)` — filter by type.

All return copies. The original timeline is not exposed.

Clearing is limited to marks and measures:

- `clearMarks(name?)` — clear all marks, or only those with a specific name.
- `clearMeasures(name?)` — clear all measures, or only those with a specific name.

Why only marks and measures? The answer connects to the recording surface model: marks and measures are annotations _you_ placed, so you can remove them. Specialized entries — paint timing, event timing, LCP — represent things that _happened_, recorded by external code. They're historical facts, not bookmarks.

## Observing the timeline

`PerformanceObserver` watches for entries as they're recorded and delivers them in batches via microtask — the same delivery pattern as `MutationObserver`. This isn't a coincidence. Both face the same design tension: synchronous recording (marks, measures, and custom entries can be created in tight loops) versus efficient delivery (calling back once per burst, not once per entry). Microtask batching resolves this the same way in both cases — entries recorded synchronously are buffered and delivered together in a single callback on the next microtask.

Observers only receive entries recorded after `observe()` is called. There is no backfill of prior timeline entries — the `buffered` option from the browser API is not supported.

```ts
const observer = new PerformanceObserver((list, obs) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.entryType, entry.duration);
  }
});

observer.observe({
  entryTypes: ['mark', 'measure', 'paint'],
  performance: window.performance,
});
```

### The `performance` option

In a browser, there's one global `performance` object and observers find it automatically. In @cliui/dom, each `Window` has its own `Performance` instance — performance data from different windows never mixes. The `observe()` method accepts a `performance` option that binds the observer to a specific instance.

When no `performance` option is provided, the observer falls back to `globalThis.window.performance`. If neither is available, `observe()` silently returns — no error, no entries, no warning. Always pass `performance` explicitly to avoid silent failures in environments where a global window may not be installed.

```ts
observer.observe({
  type: 'largest-contentful-paint',
  performance: window.performance,
});
```

Calling `observe()` multiple times is additive — entry types accumulate. Use `{ entryTypes: [...] }` for multiple types at once, or `{ type: '...' }` for a single type.

### takeRecords() and disconnect()

`takeRecords()` returns buffered entries immediately and clears the buffer. If the microtask hasn't fired yet, the subsequent callback delivers nothing — the buffer is already drained.

`disconnect()` removes the entry listener, clears all state, and releases the `Performance` reference.

### Callback shape

The callback receives a `PerformanceObserverEntryList` with `getEntries()`, `getEntriesByName(name, type?)`, and `getEntriesByType(type)` methods. All return copies sorted by `startTime`.

## The entry type system

So far, the examples have created marks and measures. But the observer pipeline carries more than user-created entries — it handles an entire taxonomy of performance data.

All entries extend `PerformanceEntry`, which provides four read-only properties: `name`, `entryType`, `startTime`, `duration`. All entries have `toJSON()`.

The entry types fall into two categories — and this distinction is the recording surface model in practice. **Self-recorded entries** — marks and measures — are created directly through the `Performance` API. The application decides what to record and when. **Instrumented entries** — paint timing, event timing, LCP — are created by external code (typically the rendering layer) and injected into the timeline. The DOM layer doesn't know what "first contentful paint" means; it just provides the infrastructure for the renderer to record it. This is what "recording surface, not measurement engine" looks like at the type level.

| Entry class              | `entryType`                  | Additional properties                               | Purpose                                                               |
| ------------------------ | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `PerformanceMark`        | `'mark'`                     | `detail`                                            | Named timestamp                                                       |
| `PerformanceMeasure`     | `'measure'`                  | `detail`                                            | Named duration                                                        |
| `PerformancePaintTiming` | `'paint'`                    | —                                                   | First contentful paint (first visible output)                         |
| `PerformanceEventTiming` | `'event'` or `'first-input'` | `processingStart`, `processingEnd`, `interactionId` | Input responsiveness — delay between user action and visible response |
| `LargestContentfulPaint` | `'largest-contentful-paint'` | `element`, `size`, `renderTime`                     | Largest rendered element by area                                      |

### PerformanceEventTiming

Tracks the lifecycle of an input event: `startTime` is when input was received, `processingStart` and `processingEnd` bracket the event handler execution, and `duration` is the total time from input to output rendered. `interactionId` groups related events (e.g., keydown and keyup) into a single logical interaction.

These entries let you measure what matters most to users — how long between "I pressed a key" and "I saw the result." The rendering layer creates these entries because it's the only layer that knows when the frame actually completed.

### LargestContentfulPaint

Tracks the largest element rendered so far — the terminal equivalent of the browser's Largest Contentful Paint metric. `size` represents the rendered area of the element — in terminal contexts, this is cell area (columns × rows) rather than pixel area. `renderTime` is both the paint timestamp and the entry's `startTime`. `toJSON()` deliberately excludes the `element` reference to avoid circular serialization issues.

### PerformancePaintTiming

The simplest entry type — just a name and a timestamp. Typically used for `'first-contentful-paint'`, recorded when the first frame produces visible output.

Instrumented entries cannot be cleared from the timeline (unlike marks and measures). They represent things that happened — the first frame painted, the largest element rendered, the user's input was processed — and removing them would falsify the record.

## The instrumentation bridge

How do instrumented entries — the ones created by the rendering layer — enter the same timeline as marks and measures?

The `Performance` class itself only creates marks and measures. Specialized entries — paint timing, event timing, LCP — come from outside and enter the timeline through `recordEntry()`.

This is the recording surface model in its purest form. `recordEntry()` is the seam where domain knowledge meets infrastructure: the renderer creates the entry with domain-specific knowledge (when the frame completed, how large the element was), and the Performance API handles storage and delivery. The DOM layer has no concept of "painting" or "input processing" — those are rendering concerns. But the observer pipeline and timeline storage _are_ DOM concerns.

```ts
import {PerformancePaintTiming} from '@cliui/dom';

// Record first contentful paint at a known timestamp
const fcp = new PerformancePaintTiming('first-contentful-paint', frameEndTime);
window.performance.recordEntry(fcp);
```

In practice, you access `window.performance` and `window.PerformanceObserver` directly, while specialized entry classes like `PerformancePaintTiming`, `PerformanceEventTiming`, and `LargestContentfulPaint` are imported from `@cliui/dom` and recorded through `recordEntry()`.

`recordEntry()` pushes the entry to the internal timeline and notifies all registered listeners. PerformanceObservers filtering for that entry's type will receive it in their next microtask delivery. This is the same internal path that `mark()` and `measure()` use — there's no second-class treatment. Whether you create a mark, measure a duration, or record a paint event, all entries flow through the same recording pipeline.

## Web-vitals compatibility

Chrome's [web-vitals](https://github.com/GoogleChrome/web-vitals) script is the de facto standard for measuring Core Web Vitals. Making it work in a non-browser environment requires satisfying two assumptions the script makes about the Performance API surface.

**`PerformanceObserver.supportedEntryTypes` must include the types web-vitals observes.** The script checks this static array before creating any observer. If the types it needs aren't listed, the entire script becomes a no-op — no error, no warning, just missing metrics. @cliui/dom's `supportedEntryTypes` includes all six types:

```ts
['mark', 'measure', 'paint', 'event', 'first-input', 'largest-contentful-paint'];
```

**`getEntriesByType('navigation')` must return a navigation-shaped entry.** The script queries navigation timing data during initialization. @cliui/dom returns a hardcoded fake entry for this query — not a real `PerformanceEntry` subclass, but an inline object with the properties web-vitals reads: `responseStart`, `activationStart`, `domInteractive`, `domContentLoadedEventStart`, `domComplete`, and `type`.

`responseStart` is set to `1` (not `0`) to prevent web-vitals from interpreting it as "no response received yet." The entry is generated fresh on each call and never stored in the timeline — PerformanceObservers subscribed to `'navigation'` will never receive it, which is expected since `'navigation'` is deliberately absent from `supportedEntryTypes`.

This is a compatibility shim, not a real navigation entry. The goal is narrow: libraries that import web-vitals don't crash. When the terminal layer records FCP, LCP, and event timing entries via `recordEntry()`, web-vitals can observe them through standard PerformanceObserver subscriptions and produce meaningful metrics. The fake navigation entry just keeps the script's initialization path from bailing out early.

## What the DOM layer leaves out

The browser Performance API is broad — navigation timing, resource timing, long task detection, server timing. @cliui/dom implements the subset that serves two needs: application-level measurement (marks, measures, observers) and renderer instrumentation (paint timing, event timing, LCP). Everything else belongs to a runtime that has concepts like "network requests" or "navigation."

- `performance.timeOrigin`
- `performance.timing` (legacy `PerformanceTiming`)
- `performance.navigation` (legacy `PerformanceNavigation`)
- `PerformanceResourceTiming` / `clearResourceTimings()` / `setResourceTimingBufferSize()`
- `PerformanceLongTaskTiming`
- `PerformanceNavigationTiming` class (only the hardcoded compatibility object)
- Observer `buffered` option (no historical entry retrieval on `observe()`)

## Where to go next

- **[What Is @cliui/dom?](./what-is-cliui-dom.md)** — the polyfill philosophy: enough for real frameworks to work
- **[Scope and Boundaries](./scope-and-boundaries.md)** — the full inventory of what's in and what's out
