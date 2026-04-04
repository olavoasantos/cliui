# Performance Vitals Example

A live dashboard demonstrating the Milestone 7 Performance Observability APIs:

- **`window.performance`** — marks, measures, and entry queries
- **`PerformanceObserver`** — subscribing to raw performance entries as they're recorded
- **`TerminalVitals`** — high-level derived metrics (FCP, LCP, INP, frame budget, etc.)

## Running

```bash
pnpm dev
```

## What it shows

| Section | Metrics |
|---|---|
| **Paint Timing** | First Contentful Paint (FCP), Largest Contentful Paint (LCP) |
| **Frame Metrics** | Dropped frames, budget utilization, idle ratio, dirty element ratio, output size |
| **Input Metrics** | Dispatch latency, INP (p98 interaction-to-next-paint) |

Press keys to generate input events and watch the input metrics update in real time.
Values are color-coded: 🟢 good, 🟡 warn, 🔴 bad.
