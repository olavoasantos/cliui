---
"@cliui/terminal": minor
---

Add performance instrumentation and terminal vitals

Instrument `renderFrame()` with performance marks and measures for paint timing. Instrument EventDispatcher with input timing capture for PerformanceEventTiming entries. TerminalVitals utility computing derived metrics: first-contentful-paint, largest-contentful-paint, cumulative-layout-shift, interaction-to-next-paint, and dropped frame percentage.
