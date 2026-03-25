# Issue Plan: M1T28 — Keyboard event dispatcher

## Understanding

Implement `EventDispatcher` in `src/terminal/classes/` to bridge parsed terminal input events into DOM events dispatched on `document.body`.

Expected scope for this issue:
- convert parsed terminal key events into DOM `KeyboardEvent` instances
- dispatch `keydown` followed synchronously by synthesized `keyup`
- convert parsed terminal paste events into DOM `ClipboardEvent` instances
- dispatch all keyboard and paste events to `document.body`
- provide mapped unit tests for event creation, property mapping, pairing, and dispatch target

## Pre-flight Baseline

`pnpm check` passes cleanly before implementation.

## Planned Steps

| Step | Status | Work |
| ---- | ------ | ---- |
| 1 | Complete | Inspect DOM event classes and design `EventDispatcher` API |
| 2 | Complete | Add mapped unit tests for keydown/keyup dispatch, modifier mapping, and paste dispatch |
| 3 | Complete | Implement `EventDispatcher` |
| 4 | Complete | Export the class from `src/terminal/index.ts` |
| 5 | Complete | Run targeted tests, then full `pnpm check` |
| 6 | Complete | Perform structural compliance audit and update milestone plan |

## Files To Create Or Modify

- `src/terminal/classes/EventDispatcher.ts`
- `src/terminal/classes/specs/EventDispatcher.unit.ts`
- `src/terminal/index.ts`
- `.ignore/plans/milestone-1-plan.md`

## Testing Approach

- key event dispatch order: `keydown` then `keyup`
- correct `key`, `code`, `ctrlKey`, `altKey`, `shiftKey`
- paste event dispatch to `document.body`
- no deep integration with focus/hit-testing yet

## Pattern Compliance Review

- single class export in `EventDispatcher.ts`
- tests map 1:1 to the class
- no extra helper exports in class file

## Progress Log

- Plan created before implementation.
- Added `EventDispatcher` to convert parsed terminal key events into DOM `KeyboardEvent` keydown/keyup pairs and parsed paste events into DOM `ClipboardEvent` instances.
- Added mapped unit tests covering event creation, modifier mapping, keydown/keyup pairing, dispatch target, and paste dispatch sequencing.
- Structural compliance audit passed: dispatch concerns remain isolated to `src/terminal/classes/EventDispatcher.ts` and mapped tests.
- `pnpm check` passes after implementation.
