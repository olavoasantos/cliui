# Issue Plan: M1T25 — Renderer orchestrator

## Understanding

Implement the top-level renderer orchestrator that composes the existing renderer building blocks:
- `Painter` paints layout boxes into a current `CellBuffer`
- `Differ` compares the current buffer against the previous frame
- `ANSIWriter` serializes changed regions into ANSI output

Dependencies are complete and verified present:
- `src/renderer/classes/Painter.ts`
- `src/renderer/classes/Differ.ts`
- `src/renderer/classes/ANSIWriter.ts`
- `src/renderer/classes/CellBuffer.ts`

The renderer must:
1. manage current and previous buffers
2. clear and repaint the current frame from layout boxes
3. diff against the previous frame
4. emit ANSI output
5. swap/copy frame state for the next render
6. resize both buffers when terminal dimensions change

## Pre-flight Baseline

`pnpm check` passes cleanly before implementation.

## Planned Steps

| Step | Status | Work |
| ---- | ------ | ---- |
| 1 | Complete | Inspect renderer and layout types, then define `Renderer` API and file changes |
| 2 | Complete | Add tests for orchestration behavior: first render, incremental diff render, no-op render, resizing |
| 3 | Complete | Implement `src/renderer/classes/Renderer.ts` with buffer lifecycle and output orchestration |
| 4 | Complete | Export `Renderer` from `src/renderer/index.ts` |
| 5 | Complete | Run targeted tests, then full `pnpm check` |
| 6 | Complete | Perform structural compliance audit and update milestone plan |

## Files To Create Or Modify

- `src/renderer/classes/Renderer.ts` — new renderer orchestrator class
- `src/renderer/classes/specs/Renderer.unit.ts` or `Renderer.integration.ts` — mapped tests for orchestration behavior
- `src/renderer/index.ts` — export the new class
- `.ignore/plans/milestone-1-plan.md` — update progress after completion

## Testing Approach

- Primary mapped test file for `Renderer`
- Cover:
  - first frame produces ANSI output from painted cells
  - unchanged second frame produces no output
  - changed subsequent frame emits only diffed output
  - resize updates buffer dimensions and re-renders correctly
- Then run full `pnpm check`

## Codebase Analogs

- `src/renderer/classes/Painter.ts` for renderer-layer style and docblocks
- `src/renderer/classes/Differ.ts` for diff contract
- `src/renderer/classes/ANSIWriter.ts` for output contract
- `src/renderer/classes/CellBuffer.ts` for buffer semantics

## Risks

1. Avoid sharing mutable buffer state across frames.
2. Ensure resize semantics do not leave stale previous-frame contents.
3. Keep orchestration in one class without embedding helper concerns that belong elsewhere.

## Pattern Compliance Review

- `Renderer.ts` is a class file with one named export only.
- No helper utilities will be colocated in the class file unless they are private methods.
- Tests will map 1:1 to the production file.
- No inferred TS types from runtime objects.
- No trailing `/index` imports.

## Progress Log

- Plan created before implementation.
- Added `Renderer` with double-buffer orchestration, buffer resizing, and paint→diff→ANSI sequencing.
- Added mapped unit coverage for first-frame rendering, no-op frames, incremental diffs, multiple roots, and resizing.
- Added renderer integration coverage for the full styled layout-box pipeline to ANSI output.
- Structural compliance audit passed: one concern per file, direct imports, no unnecessary barrels, tests mapped to the renderer class.
- `pnpm check` passes after implementation.
