# Issue Plan: M1T26 — Terminal mode management

## Understanding

Implement `TerminalManager` in `src/terminal/classes/` to manage terminal startup and shutdown mode transitions for TUI operation.

Expected scope for this issue:
- enter alternate screen buffer when configured
- enable raw mode on the input stream
- hide the cursor
- optionally enable mouse reporting (SGR 1006)
- enable focus reporting (1004)
- enable bracketed paste (2004)
- reverse those changes on shutdown in reverse order
- provide unit tests that mock output and assert emitted escape sequences

Dependencies are external/source-structure only and are verified present. No existing terminal implementation is in place yet.

## Pre-flight Baseline

`pnpm check` passes cleanly before implementation.

## Planned Steps

| Step | Status | Work |
| ---- | ------ | ---- |
| 1 | Complete | Inspect terminal layer state and define `TerminalManager` API and supporting terminal types |
| 2 | Complete | Add mapped unit tests for startup/shutdown sequencing, configurability, and idempotent lifecycle behavior |
| 3 | Complete | Implement terminal stream/config types in `src/terminal/types/` if needed |
| 4 | Complete | Implement `src/terminal/classes/TerminalManager.ts` with startup/shutdown sequencing and raw-mode handling |
| 5 | Complete | Export the class and types from `src/terminal/index.ts` |
| 6 | Complete | Run targeted tests, then full `pnpm check` |
| 7 | Complete | Perform structural compliance audit and update milestone plan |

## Files To Create Or Modify

- `src/terminal/classes/TerminalManager.ts` — new terminal mode manager class
- `src/terminal/classes/specs/TerminalManager.unit.ts` — mapped unit tests
- `src/terminal/types/index.ts` — explicit terminal stream/config interfaces if needed
- `src/terminal/index.ts` — export class and public terminal-layer types
- `.ignore/plans/milestone-1-plan.md` — mark progress after completion

## Testing Approach

Unit tests will cover:
- startup sequence with alt screen and mouse enabled
- startup sequence with optional features disabled
- shutdown sequence reverses startup correctly
- raw mode enable/disable calls happen at the right times
- repeated startup/shutdown calls are safe and do not duplicate side effects

## Codebase Analogs

- `src/renderer/classes/Renderer.ts` for single-class orchestration style and docblocks
- `src/renderer/classes/specs/Renderer.unit.ts` for mapped orchestrator testing pattern
- Bubble Tea references for terminal lifecycle ordering only; implementation remains Node-native

## Risks

1. Input stream raw mode is only available on TTY-like streams, so the API should type and guard it carefully.
2. Startup/shutdown should stay idempotent to avoid duplicate escape sequences in later `Terminal` orchestration.
3. Avoid baking future capability-detection concerns into this issue.

## Pattern Compliance Review

- `TerminalManager.ts` will contain one class export only.
- Any public terminal-layer interfaces will live in `src/terminal/types/index.ts`.
- Tests will map 1:1 to the class.
- No trailing `/index` imports.
- No helper utilities grouped into the class file beyond private methods.

## Progress Log

- Plan created before implementation.
- Added terminal-layer public types for raw-capable input streams, output streams, and manager configuration.
- Implemented `TerminalManager` with idempotent startup/shutdown lifecycle, raw-mode toggling, alternate-screen support, cursor visibility control, focus reporting, bracketed paste mode, and optional mouse mode 1006.
- Added mapped unit coverage for startup ordering, optional feature flags, reverse-order shutdown, idempotency, and non-raw-capable input streams.
- Structural compliance audit passed: one class per file, explicit terminal types in `src/terminal/types/index.ts`, direct exports from `src/terminal/index.ts`, and 1:1 mapped tests.
- `pnpm check` passes after implementation.
