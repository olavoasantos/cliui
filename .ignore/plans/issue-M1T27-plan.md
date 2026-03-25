# Issue Plan: M1T27 — Keyboard input reader

## Understanding

Implement `InputReader` in `src/terminal/classes/` to consume raw terminal input bytes and parse them into structured terminal input events for later DOM dispatch.

Expected scope for this issue:
- read raw bytes from an input stream
- parse ANSI escape sequences into structured key events
- handle printable keys, arrows, function keys, navigation keys, and modifier combinations
- parse bracketed paste start/end sequences into paste messages
- provide unit tests feeding known byte sequences

This issue is parallelizable with M1T26 in the milestone, but M1T26 is already complete.

## Pre-flight Baseline

`pnpm check` passes cleanly before implementation.

## Planned Steps

| Step | Status | Work |
| ---- | ------ | ---- |
| 1 | Complete | Define terminal input event types and extend terminal stream contracts for readable input |
| 2 | Complete | Add mapped unit tests for direct parsing, stream subscription, modifiers, special keys, and bracketed paste |
| 3 | Complete | Implement `InputReader` with buffered ANSI parsing and stream lifecycle methods |
| 4 | Complete | Export the class and new terminal input types from `src/terminal/index.ts` |
| 5 | Complete | Run targeted tests, then full `pnpm check` |
| 6 | Complete | Perform structural compliance audit and update milestone plan |

## Files To Create Or Modify

- `src/terminal/classes/InputReader.ts` — new terminal input parser class
- `src/terminal/classes/specs/InputReader.unit.ts` — mapped unit tests
- `src/terminal/types/index.ts` — explicit parsed input event and readable stream interfaces
- `src/terminal/index.ts` — export the class and terminal-layer types
- `.ignore/plans/milestone-1-plan.md` — mark progress after completion

## Testing Approach

Unit tests will cover:
- printable characters
- ctrl/alt/shift modifiers where representable via escape sequences
- arrows and navigation keys
- F1–F12 support
- delete/backspace/enter/tab/escape
- bracketed paste parsing
- stream start/stop wiring and chunk buffering for partial sequences

## Codebase Analogs

- `src/terminal/classes/TerminalManager.ts` for terminal-layer class shape and docblocks
- `src/terminal/classes/specs/TerminalManager.unit.ts` for mapped test style
- Bubble Tea `key.go` as a protocol reference only

## Risks

1. Escape-sequence parsing is stateful; partial chunks must not emit incorrect events.
2. ESC as a standalone key must be distinguished from Alt-modified sequences.
3. Avoid overreaching into future mouse/focus parsing reserved for later issues.

## Pattern Compliance Review

- `InputReader.ts` will contain one class export only.
- Terminal event interfaces will live in `src/terminal/types/index.ts`.
- Tests map 1:1 to the class.
- No unnecessary barrels or trailing `/index` imports.

## Progress Log

- Plan created before implementation.
- Added terminal input event types for parsed key and paste messages, plus a readable-input stream contract.
- Implemented `InputReader` with buffered ANSI parsing for printable keys, control keys, arrows, navigation keys, F1–F12, modifier decoding, Alt-prefixed keys, and bracketed paste.
- Added mapped unit tests covering direct parsing, stream lifecycle wiring, modifier combinations, special keys, bracketed paste buffering, and incomplete escape-sequence buffering.
- Structural compliance audit passed: input parsing remains isolated to `src/terminal/classes/InputReader.ts`, explicit types live in `src/terminal/types/index.ts`, and tests map 1:1 to the class.
- `pnpm check` passes after implementation.
