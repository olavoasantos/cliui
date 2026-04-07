---
"@cliui/devtools": minor
---

Add V8 inspector proxy

Proxy Debugger, Profiler, and HeapProfiler domains to the V8 inspector via `node:inspector`. Unlocks Sources panel (breakpoints, stepping), CPU profiling, and memory inspection. HeapProfiler sampling works directly; full heap snapshots run in a worker thread to prevent segfault.
