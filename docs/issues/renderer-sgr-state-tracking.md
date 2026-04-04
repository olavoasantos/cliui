# Renderer SGR State Tracking Bug

## Problem

The ANSIWriter's SGR (Select Graphic Rendition) state tracking diverges from the terminal's actual SGR state when differential rendering is used. This causes two visible symptoms:

### 1. SGR attribute leak across elements

When a cell with a non-default SGR attribute (e.g., `faint` from `opacity < 0.5`) is written as part of a frame's diff, the terminal retains that attribute for all subsequent cursor positions. Elements that were NOT part of the diff — because their cells didn't change — inherit the leaked SGR state visually.

**Reproduction:** In the CSS transitions example, press O to trigger an opacity transition. Sections below the opacity box appear faded even though their computed styles are unaffected.

**Root cause:** The ANSIWriter emits SGR codes relative to a tracked internal state that resets at the start of each `write()` call. But the terminal's actual SGR state is whatever was left after the PREVIOUS frame's last written cell. When a new frame's first region is written, the ANSIWriter emits a cursor-move but no SGR reset — it assumes the terminal is in default state because it just reset its tracker. The terminal is actually in whatever state the last frame left it in.

### 2. Text corruption during rapid style changes

When multiple elements have active CSS animations (especially color animations), the differential renderer produces per-frame diffs that touch cells across multiple screen regions. The cursor jumps between regions emitting SGR deltas, but the accumulated SGR state across regions can diverge from what each region's cells expect, producing garbled text with incorrect colors/attributes.

**Reproduction:** In the CSS animations example, press A to toggle all animations. The section labels and static text between animated elements show corrupted characters with wrong colors.

**Root cause:** Same fundamental issue — the ANSIWriter's SGR state tracker and the terminal's actual SGR state diverge across frames because the diff only writes changed cells, not all cells.

## Analysis

The core problem is an architectural assumption in the renderer: the diff algorithm produces minimal cell-by-cell changes, and the ANSIWriter emits SGR deltas between consecutive cells within a single `write()` call. This works correctly WITHIN a single frame's diff. But ACROSS frames, the terminal retains whatever SGR state the last frame's last cell set, while the ANSIWriter's tracker resets to defaults.

A naive fix (emitting `ESC[0m` at the end of each frame) was attempted and reverted — it reset ALL styling, and the next frame's diff assumed the previous frame's styling was still active, producing a fully garbled screen.

## Potential Approaches

1. **Persist ANSIWriter state across frames.** Don't call `resetState()` at the start of `write()`. Instead, let the state carry over from the previous frame. The first cell in each region would then emit the correct SGR delta relative to the terminal's actual state.

2. **Emit a full SGR reset + full re-emit for the first cell of each region.** Before each cursor-move to a new region, emit `ESC[0m` to reset, then emit the full SGR for the first cell. This is slightly more bytes but guarantees correctness.

3. **Track "terminal state at each cursor position"** in the cell buffer, and when the diff jumps to a new region, emit whatever SGR codes are needed to transition from the terminal's current state to the target cell's state.

Approach 1 is the simplest and most efficient — it requires removing the `resetState()` call and persisting the `ANSIWriter`'s `state` object across `write()` invocations.

## Files Involved

- `cliui/terminal/src/renderer/classes/ANSIWriter.ts` — SGR state tracking and emission
- `cliui/terminal/src/renderer/classes/Differ.ts` — produces changed regions
- `cliui/terminal/src/renderer/classes/Renderer.ts` — orchestrates paint → diff → write

## Dependencies

- None (standalone renderer fix)
- Blocks: smooth CSS animation/transition rendering, opacity transitions
