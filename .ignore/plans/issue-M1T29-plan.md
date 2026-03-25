# Issue Plan: M1T29 — Terminal class and render loop

## Understanding

Implement the public `Terminal` class in `src/classes/Terminal.ts` to wire together the DOM, style engine, layout engine, renderer, terminal mode management, input reader, and DOM event dispatch.

Expected scope for this issue:
- constructor accepts `altScreen`, `mouse`, `fps`, `output`, and `input`
- exposes `document` and `window`
- `run()` initializes terminal modes, starts the input bridge, performs an initial frame, then starts a background frame loop and returns
- `exit()` stops the loop and restores terminal state
- `src/index.ts` exports `Terminal` and necessary DOM/public types
- integration test verifies end-to-end rendering to ANSI output

## Pre-flight Baseline

`pnpm check` passes cleanly before implementation.

## Planned Steps

| Step | Status | Work |
| ---- | ------ | ---- |
| 1 | Complete | Define public `TerminalOptions` and inspect existing style/layout/renderer APIs |
| 2 | Complete | Add mapped integration and unit coverage for construction, initial run output, and shutdown cleanup |
| 3 | Complete | Implement `Terminal` with initial frame render, background loop, input dispatch wiring, and cleanup |
| 4 | Complete | Export `Terminal` and public types from `src/index.ts` |
| 5 | Complete | Run targeted tests, then full `pnpm check` |
| 6 | Complete | Perform structural compliance audit, update milestone plan, and finalize milestone status |

## Files To Create Or Modify

- `src/classes/Terminal.ts`
- `src/classes/specs/Terminal.integration.ts`
- `src/types/index.ts`
- `src/index.ts`
- `src/terminal/types/index.ts` (if terminal stream capabilities need extension)
- `.ignore/plans/milestone-1-plan.md`

## Testing Approach

- integration test for `run()` producing ANSI output from DOM content
- verify constructor wiring and `document`/`window` exposure
- verify `exit()` stops lifecycle and restores terminal modes
- reuse fake input/output streams to avoid real TTY coupling

## Pattern Compliance Review

- `Terminal.ts` contains one class export only
- public constructor options type lives outside the class file
- tests map to the class
- no helper exports in class file

## Progress Log

- Plan created before implementation.
- Added public `TerminalOptions` and implemented the `Terminal` class as the Phase 1 entry point that wires DOM, style, layout, renderer, terminal mode management, input reading, and DOM event dispatch together.
- `run()` now initializes terminal modes, attaches input dispatch, renders an initial frame immediately, and starts a background render loop; `exit()` stops the loop and restores the terminal.
- Added root public exports from `src/index.ts` for `Terminal`, key DOM classes, and terminal input/output types.
- Added integration coverage verifying end-to-end DOM-to-ANSI rendering, input wiring, and cleanup behavior.
- Structural compliance audit passed: the public class remains isolated to `src/classes/Terminal.ts`, public options live in `src/types/index.ts`, and tests map to the class.
- `pnpm check` passes after implementation.
