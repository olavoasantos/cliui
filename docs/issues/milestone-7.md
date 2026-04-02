# Milestone 7: Performance Observability — Issues

## Working Summary

Phase 7 adds performance observability to terminal-dom. The browser has `window.performance` and Web Vitals — this milestone brings the same concepts to the terminal: a standard Performance API in the DOM polyfill, instrumentation of the render pipeline and input dispatch, and a higher-level Terminal Vitals utility that computes derived metrics.

**Three groups of work:**

1. **Performance API (M7T1–M7T5):** Implement the standard browser Performance API classes in the DOM polyfill — `PerformanceEntry`, `PerformanceMark`, `PerformanceMeasure`, `Performance`, `PerformanceObserver`, `PerformanceEventTiming`, `PerformancePaintTiming`, and `LargestContentfulPaint`. Wire `window.performance` and expose `PerformanceObserver` on `Window`.
2. **Instrumentation (M7T6–M7T9):** Record a pre-instrumentation performance baseline, instrument `renderFrame()` and `EventDispatcher` to emit timing entries, verify the overhead is acceptable, and add an opt-out mechanism if needed.
3. **Terminal Vitals (M7T10):** A higher-level utility that consumes raw `PerformanceObserver` entries and computes derived metrics — like the `web-vitals` library does for browsers.

**Key context from the design conversation:**

- The Performance API lives in the DOM polyfill because `window.performance` and `PerformanceObserver` are browser globals. Terminal-dom's DOM polyfill provides the browser-like environment, so these belong there.
- Entry names reuse standard Web Vitals names when the concept is the same: `first-contentful-paint`, `largest-contentful-paint`, `first-input`, `event`. Terminal-specific internal profiling measures use a `terminal.*` namespace: `terminal.frame`, `terminal.frame.style`, `terminal.frame.layout`, etc.
- `PerformanceEventTiming` entries follow the browser's shape with `processingStart`, `processingEnd`, and `duration` (which spans from input received to next frame written — the full INP measurement).
- `terminal.frame` measures carry a `detail` object with non-timing metadata (dirty element count, total element count, output bytes, idle flag) so the vitals utility can compute ratios without custom entry types.
- The performance baseline **must** be recorded after the Performance API classes are implemented but **before** any instrumentation is wired into the render loop or input dispatch. This isolates the measurement overhead.
- Thresholds are not included in this milestone. They require empirical data from real applications and benchmarks. The vitals utility reports raw derived metrics; a threshold system can be added later.
- Node's `performance.now()` from `perf_hooks` is the high-resolution clock source internally. The API surface is the standard browser `Performance` interface.

**Entry taxonomy:**

| Name | Entry Type | Source | Shape |
|---|---|---|---|
| `first-contentful-paint` | `paint` | Render instrumentation | `PerformancePaintTiming` |
| `largest-contentful-paint` | `largest-contentful-paint` | Render instrumentation | `LargestContentfulPaint` |
| _(first interaction)_ | `first-input` | Input instrumentation | `PerformanceEventTiming` |
| _(per interaction)_ | `event` | Input instrumentation | `PerformanceEventTiming` |
| `terminal.frame` | `measure` | Render instrumentation | `PerformanceMeasure` with `detail` |
| `terminal.frame.style` | `measure` | Render instrumentation | `PerformanceMeasure` |
| `terminal.frame.layout` | `measure` | Render instrumentation | `PerformanceMeasure` |
| `terminal.frame.paint` | `measure` | Render instrumentation | `PerformanceMeasure` |
| `terminal.frame.diff` | `measure` | Render instrumentation | `PerformanceMeasure` |
| `terminal.frame.ansi` | `measure` | Render instrumentation | `PerformanceMeasure` |
| `terminal.frame.write` | `measure` | Render instrumentation | `PerformanceMeasure` |

**`terminal.frame` detail payload:**

```ts
interface FrameDetail {
  dirtyElements: number;
  totalElements: number;
  outputBytes: number;
  idle: boolean;
}
```

**Derived metrics (computed by Terminal Vitals, not raw entries):**

- **Dropped frames** — `terminal.frame` measures where `duration` exceeds the frame budget
- **Frame budget utilization** — `terminal.frame` `duration / budget`
- **Idle frame ratio** — frames where `detail.idle` is true / total frames
- **Dirty element ratio** — `detail.dirtyElements / detail.totalElements` per frame
- **Frame output size** — `detail.outputBytes` per frame
- **Input dispatch latency** — `processingStart - startTime` from `event` entries

---

## Issues

### M7T1: Performance entry base classes

**Summary**

Implement the standard `PerformanceEntry`, `PerformanceMark`, and `PerformanceMeasure` classes in the DOM polyfill. These are the data objects that all performance measurements produce. `PerformanceEntry` is the base with `name`, `entryType`, `startTime`, and `duration`. `PerformanceMark` and `PerformanceMeasure` extend it with `detail`.

**Expected Outcomes**

- `PerformanceEntry` class exists in `src/dom/classes/` with read-only `name`, `entryType`, `startTime`, `duration` properties and a `toJSON()` method
- `PerformanceMark` class extends `PerformanceEntry` with `entryType: 'mark'` and an optional `detail` property
- `PerformanceMeasure` class extends `PerformanceEntry` with `entryType: 'measure'` and an optional `detail` property
- Types for constructor options (`PerformanceMarkOptions`, `PerformanceMeasureOptions`) are defined in `src/dom/types/`
- Unit tests cover construction, property access, `toJSON()` serialization, and immutability of read-only properties

**Dependencies**

- None (standalone data classes)

---

### M7T2: Performance class and Window integration

**Summary**

Implement the `Performance` class and wire it to `window.performance`. This is the central API for recording and querying performance entries. Provides `now()` (high-resolution timestamp via Node's `perf_hooks`), `mark()`, `measure()`, `getEntries()`, `getEntriesByName()`, `getEntriesByType()`, `clearMarks()`, and `clearMeasures()`.

**Expected Outcomes**

- `Performance` class exists in `src/dom/classes/`
- `now()` returns a high-resolution timestamp using Node's `performance.now()` from `perf_hooks`
- `mark(name, options?)` creates and stores a `PerformanceMark`, returns it
- `measure(name, options?)` creates and stores a `PerformanceMeasure`, returns it — supports `start`/`end` as mark names or timestamps, and `duration` override, and `detail`
- `getEntries()` returns all stored entries sorted by `startTime`
- `getEntriesByName(name, type?)` and `getEntriesByType(type)` filter accordingly
- `clearMarks(name?)` and `clearMeasures(name?)` remove matching entries
- `Window.performance` is a `Performance` instance, assigned in the `Window` constructor
- Unit tests cover all methods, entry storage/retrieval, sorting, filtering, and clearing

**Dependencies**

- M7T1: Performance entry base classes (`PerformanceMark`, `PerformanceMeasure`)
- M1T3: Window class (integration target for `window.performance`)

---

### M7T3: PerformanceObserver

**Summary**

Implement `PerformanceObserver` — the subscription mechanism for receiving performance entries as they are recorded. Follows the browser API: construct with a callback, call `observe()` to subscribe to entry types, and receive batched entries via the callback. Entries are delivered asynchronously via microtask, matching browser behavior. Expose `PerformanceObserver` on `Window` (like `window.PerformanceObserver` in browsers).

**Expected Outcomes**

- `PerformanceObserver` class exists in `src/dom/classes/`
- Constructor accepts a `PerformanceObserverCallback` (`(list: PerformanceObserverEntryList, observer: PerformanceObserver) => void`)
- `observe(options)` subscribes to entries — supports `{ entryTypes: string[] }` for multiple types and `{ type: string }` for single type observation
- `disconnect()` stops all observation
- `takeRecords()` returns buffered entries and clears the buffer
- `PerformanceObserverEntryList` provides `getEntries()`, `getEntriesByName()`, `getEntriesByType()`
- When `Performance` records a new entry, all matching observers are notified via microtask-batched callback delivery
- `Window.PerformanceObserver` is assigned the class (like `window.MutationObserver` pattern already in the codebase)
- Unit tests cover: subscribing to specific entry types, callback delivery timing (microtask), batched delivery of multiple entries, `disconnect()`, `takeRecords()`, and filtering by type/name

**Dependencies**

- M7T2: Performance class (the entry source that notifies observers)
- M1T3: Window class (exposed as `window.PerformanceObserver`)

---

### M7T4: PerformanceEventTiming

**Summary**

Implement `PerformanceEventTiming` — the extended entry type used for input responsiveness metrics (FID and INP). Follows the browser's shape: `startTime` is when input was received, `processingStart` is when the event handler began, `processingEnd` is when the handler returned, and `duration` spans from input received to next frame written.

**Expected Outcomes**

- `PerformanceEventTiming` class exists in `src/dom/classes/`, extends `PerformanceEntry`
- Read-only properties: `processingStart`, `processingEnd`, `name` (event type, e.g. `'keydown'`, `'click'`), `interactionId` (unique ID per logical interaction)
- `entryType` is `'event'` for general interactions, `'first-input'` for the first interaction
- `duration` spans from `startTime` (input bytes received) to the completion of the next rendered frame
- `toJSON()` includes the additional properties
- Types for construction options are defined in `src/dom/types/`
- Unit tests cover construction, property access, `toJSON()`, and both `'event'` and `'first-input'` entry types

**Dependencies**

- M7T1: PerformanceEntry base class

_Can run in parallel with M7T2 and M7T3._

---

### M7T5: Paint timing entry classes

**Summary**

Implement `PerformancePaintTiming` (for `first-contentful-paint`) and `LargestContentfulPaint` entry classes. `PerformancePaintTiming` is a simple entry with `entryType: 'paint'`. `LargestContentfulPaint` extends `PerformanceEntry` with `element`, `size`, and `renderTime` — tracking when the largest element (by cell area) first renders non-empty content.

**Expected Outcomes**

- `PerformancePaintTiming` class exists in `src/dom/classes/`, extends `PerformanceEntry` with `entryType: 'paint'`
- `LargestContentfulPaint` class exists in `src/dom/classes/`, extends `PerformanceEntry` with `entryType: 'largest-contentful-paint'`
- `LargestContentfulPaint` has read-only properties: `element` (the DOM element), `size` (cell area: `contentWidth × contentHeight`), `renderTime` (when it was painted)
- `toJSON()` includes the additional properties (excluding `element` reference to avoid circular serialization)
- Unit tests cover construction, property access, and `toJSON()`

**Dependencies**

- M7T1: PerformanceEntry base class

_Can run in parallel with M7T2, M7T3, and M7T4._

---

### M7T6: Record pre-instrumentation performance baseline

**Summary**

Capture a performance baseline of the existing render pipeline and input dispatch **before** any instrumentation is added. This baseline is the "before" measurement that M7T9 compares against to quantify the overhead of performance observation.

This is a **gate task** — it must complete before M7T7 and M7T8 begin. The baseline captures the system's performance with the Performance API classes loaded (M7T1–M7T5) but with no instrumentation wired into `renderFrame()` or `EventDispatcher`.

**Expected Outcomes**

- `pnpm test:performance:record` is run and a reference snapshot is saved to `.testing/performance/reference.json`
- The existing benchmark suite (Terminal, StyleEngine, LayoutEngine, Renderer, Differ, Painter, FlexLayout, TextLayout, cellWidth, EventDispatcher, InputReader, DOM benchmarks) is verified to still pass
- The baseline file is committed alongside the Performance API classes so it's available for comparison in M7T9

**Dependencies**

- M7T1–M7T5: Performance API classes must be implemented (they are loaded but not yet instrumented)

---

### M7T7: Frame cycle instrumentation

**Summary**

Instrument `Terminal.renderFrame()` to record performance entries for each phase of the render cycle. Uses `window.performance.mark()` and `window.performance.measure()` to record timing. Also records `first-contentful-paint` and `largest-contentful-paint` entries when their conditions are met.

**Expected Outcomes**

- Each `renderFrame()` invocation records a `terminal.frame` measure spanning the full cycle, with `detail` containing `{ dirtyElements, totalElements, outputBytes, idle }`
- Sub-phase measures are recorded: `terminal.frame.style`, `terminal.frame.layout`, `terminal.frame.paint`, `terminal.frame.diff`, `terminal.frame.ansi`, `terminal.frame.write`
- A `first-contentful-paint` entry (`PerformancePaintTiming`) is recorded once — on the first frame that writes non-empty ANSI output, with `startTime` relative to `terminal.run()` invocation
- A `largest-contentful-paint` entry (`LargestContentfulPaint`) is recorded when the largest element by cell area (`contentWidth × contentHeight`) first renders non-empty content — updated if a larger element renders on a subsequent frame, until the first user interaction (matching browser LCP behavior)
- Frames where the early-return path is taken (no changes detected) record a `terminal.frame` measure with `detail.idle: true` and near-zero duration
- `PerformanceObserver` subscribers for `'measure'`, `'paint'`, and `'largest-contentful-paint'` entry types receive the entries
- Unit tests verify entry recording for each phase, `detail` payload contents, FCP timing, and LCP tracking with element size comparison
- Integration tests verify the full observer flow: subscribe → render frames → receive entries

**Dependencies**

- M7T2: Performance class (for `mark()`/`measure()`)
- M7T3: PerformanceObserver (for entry delivery)
- M7T5: Paint timing classes (`PerformancePaintTiming`, `LargestContentfulPaint`)
- M7T6: Pre-instrumentation baseline must be recorded first
- M1T29: Terminal class (the render loop being instrumented)

---

### M7T8: Input dispatch instrumentation

**Summary**

Instrument `EventDispatcher` to record `PerformanceEventTiming` entries for each dispatched input event. Records `startTime` when raw input bytes are received, `processingStart`/`processingEnd` around event handler execution, and finalizes `duration` when the next frame completes rendering. Also records the `first-input` entry for the first interaction.

**Expected Outcomes**

- Each dispatched input event (keyboard, mouse, wheel) produces a `PerformanceEventTiming` entry with `entryType: 'event'`
- `startTime` is captured when raw input bytes arrive at `InputReader`
- `processingStart` is captured before event dispatch, `processingEnd` after all handlers return
- `duration` is finalized after the next `renderFrame()` completes — spanning from input received to frame written (the full INP measurement)
- The first dispatched input event additionally produces a `PerformanceEventTiming` entry with `entryType: 'first-input'`
- `interactionId` groups related events (e.g., `mousedown` + `mouseup` + `click` from a single click share an ID)
- `PerformanceObserver` subscribers for `'event'` and `'first-input'` entry types receive the entries
- Unit tests verify entry creation, timing property values, `first-input` one-shot behavior, and `interactionId` grouping
- Integration tests verify the full flow: input bytes → parse → dispatch → render → observer receives finalized entry

**Dependencies**

- M7T2: Performance class (for recording entries)
- M7T3: PerformanceObserver (for entry delivery)
- M7T4: PerformanceEventTiming (the entry class)
- M7T6: Pre-instrumentation baseline must be recorded first
- M1T28: EventDispatcher (being instrumented)
- M1T27: InputReader (timestamp capture point)

_Can run in parallel with M7T7._

---

### M7T9: Verify instrumentation overhead

**Summary**

Compare the instrumented system's performance against the pre-instrumentation baseline from M7T6. Quantify the overhead of performance observation and document the results. If overhead exceeds acceptable levels, implement an opt-out mechanism.

**Expected Outcomes**

- `pnpm test:performance:compare` is run against the baseline from M7T6
- The overhead of instrumentation is documented with concrete numbers (e.g., "full frame render: +X.Xms / +Y%") for each benchmark scenario
- If overhead is within acceptable bounds: document the finding, update the baseline with `pnpm test:performance:record`, and commit the new reference
- If overhead is unacceptable: implement a constructor option (`{ performance: false }`) that disables all `mark()`/`measure()` recording in the render loop and input dispatch, making the overhead zero when disabled; update benchmarks to verify zero overhead when disabled
- The final determination and measurements are documented in the plan file

**Dependencies**

- M7T7: Frame cycle instrumentation (must be complete to measure its impact)
- M7T8: Input dispatch instrumentation (must be complete to measure its impact)
- M7T6: Pre-instrumentation baseline (the "before" snapshot to compare against)

---

### M7T10: Terminal Vitals utility

**Summary**

Implement a higher-level utility that consumes raw `PerformanceObserver` entries and computes derived terminal vitals metrics — analogous to how the `web-vitals` library computes LCP, INP, and CLS from raw browser performance entries. Reports metrics via a callback-based API.

**Expected Outcomes**

- A `TerminalVitals` class exists in `src/classes/` (or `src/utilities/` — one function if stateless, class if stateful)
- Accepts a `window.performance` instance and subscribes to relevant entry types via `PerformanceObserver`
- Computes and reports the following derived metrics:
  - **Dropped frames**: count and list of `terminal.frame` entries where `duration` exceeded the frame budget (budget = `1000 / fps`)
  - **Frame budget utilization**: `duration / budget` ratio per frame, reported as current value and running average
  - **Idle frame ratio**: proportion of frames with `detail.idle === true`
  - **Dirty element ratio**: `detail.dirtyElements / detail.totalElements` per frame, reported as current value and running average
  - **Frame output size**: `detail.outputBytes` per frame, reported as current value and running average
  - **Input dispatch latency**: `processingStart - startTime` from `event` entries, reported per-event and as p50/p98
  - **INP** (Interaction to Next Paint): `duration` from `event` entries at p98 (matching the browser's INP definition)
  - **FCP** (First Contentful Paint): `startTime` from the `first-contentful-paint` paint entry
  - **LCP** (Largest Contentful Paint): `renderTime` from the latest `largest-contentful-paint` entry
- Reports via a callback-based API: `onMetric(name, callback)` or equivalent
- Provides a `disconnect()` method to stop observation and clean up
- Exported from `src/index.ts` as part of the public API
- Unit tests verify each derived metric computation from known entry sequences
- Integration tests verify the end-to-end flow: render frames → vitals utility reports correct metrics

**Dependencies**

- M7T7: Frame cycle instrumentation (produces the `terminal.frame` and paint entries)
- M7T8: Input dispatch instrumentation (produces `event` and `first-input` entries)
- M7T3: PerformanceObserver (the subscription mechanism)

---
