import {describe, expect, it} from 'vitest';

import type {Cell, ChangedRegion} from '../../types';
import {ANSIWriter} from '../ANSIWriter';

function createCell(overrides: Partial<Cell> = {}): Cell {
  return {
    char: ' ',
    fg: null,
    bg: null,
    bold: false,
    italic: false,
    underline: 'none',
    underlineColor: null,
    strikethrough: false,
    faint: false,
    hyperlink: null,
    ...overrides,
  };
}

function region(x: number, y: number, cells: Cell[]): ChangedRegion {
  return {x, y, cells};
}

describe('ANSIWriter cross-frame SGR persistence', () => {
  it('emits SGR reset for faint when the next frame writes a non-faint cell', () => {
    const writer = new ANSIWriter();

    // Frame 1: write a faint cell
    writer.write([region(0, 0, [createCell({char: 'F', faint: true})])]);

    // Frame 2: write a NON-faint cell at a different position
    const frame2 = writer.write([region(0, 1, [createCell({char: 'N', faint: false})])]);

    // The writer must emit SGR 22 (reset bold/faint) because the terminal
    // is still in faint mode from frame 1's last cell.
    expect(frame2).toContain('\u001B[22m');
    expect(frame2).toContain('N');
  });

  it('does NOT emit redundant SGR when next frame continues the same style', () => {
    const writer = new ANSIWriter();

    // Frame 1: write a red cell
    writer.write([region(0, 0, [createCell({char: 'A', fg: {r: 255, g: 0, b: 0}})])]);

    // Frame 2: write another red cell at a different position
    const frame2 = writer.write([
      region(0, 1, [createCell({char: 'B', fg: {r: 255, g: 0, b: 0}})]),
    ]);

    // The writer should NOT emit a new fg color SGR because
    // the terminal already has red from frame 1.
    expect(frame2).not.toContain('38;2');
    expect(frame2).toContain('B');
  });

  it('emits fg color change when frame 2 uses a different color than frame 1 left', () => {
    const writer = new ANSIWriter();

    // Frame 1: write a red cell
    writer.write([region(0, 0, [createCell({char: 'A', fg: {r: 255, g: 0, b: 0}})])]);

    // Frame 2: write a blue cell
    const frame2 = writer.write([
      region(0, 1, [createCell({char: 'B', fg: {r: 0, g: 0, b: 255}})]),
    ]);

    // Must emit the new blue color
    expect(frame2).toContain('38;2;0;0;255');
  });

  it('emits bold reset when frame 2 writes non-bold after frame 1 ended with bold', () => {
    const writer = new ANSIWriter();

    // Frame 1: bold cell
    writer.write([region(0, 0, [createCell({char: 'B', bold: true})])]);

    // Frame 2: non-bold cell
    const frame2 = writer.write([region(0, 1, [createCell({char: 'N', bold: false})])]);

    // Must emit SGR 22 (reset bold/faint)
    expect(frame2).toContain('22');
  });

  it('handles multiple frames of accumulating state correctly', () => {
    const writer = new ANSIWriter();

    // Frame 1: bold + red
    writer.write([region(0, 0, [createCell({char: 'A', bold: true, fg: {r: 255, g: 0, b: 0}})])]);

    // Frame 2: just italic (no bold, no color)
    const frame2 = writer.write([region(0, 1, [createCell({char: 'B', italic: true})])]);

    // Must reset bold (22), reset fg (39), set italic (3)
    expect(frame2).toContain('22');
    expect(frame2).toContain('39');
    expect(frame2).toContain('3');
  });
});
