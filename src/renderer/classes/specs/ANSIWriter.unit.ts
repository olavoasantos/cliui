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

describe('ANSIWriter', () => {
  const writer = new ANSIWriter();

  it('emits cursor movement and character data for plain cells', () => {
    const output = writer.write([region(2, 1, [createCell({char: 'A'}), createCell({char: 'B'})])]);

    expect(output).toBe('\u001B[2;3HAB');
  });

  it('emits SGR sequences for styled cells', () => {
    const output = writer.write([
      region(0, 0, [
        createCell({
          char: 'X',
          fg: {r: 1, g: 2, b: 3},
          bg: {r: 4, g: 5, b: 6},
          bold: true,
          italic: true,
          underline: 'double',
          underlineColor: {r: 7, g: 8, b: 9},
          strikethrough: true,
          faint: true,
        }),
      ]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[1;2;3;4:2;58;2;7;8;9;9;38;2;1;2;3;48;2;4;5;6mX');
  });

  it('resets attributes efficiently when styles change between adjacent cells', () => {
    const output = writer.write([
      region(0, 0, [
        createCell({char: 'A', bold: true, fg: {r: 255, g: 0, b: 0}}),
        createCell({char: 'B', fg: {r: 255, g: 0, b: 0}}),
      ]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[1;38;2;255;0;0mA\u001B[22mB');
  });

  it('emits underline resets and color resets when returning to defaults', () => {
    const output = writer.write([
      region(0, 0, [
        createCell({char: 'A', underline: 'solid', underlineColor: {r: 9, g: 8, b: 7}}),
        createCell({char: 'B'}),
      ]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[4:1;58;2;9;8;7mA\u001B[24;59mB');
  });

  it('emits hyperlink OSC 8 sequences when hyperlink targets change', () => {
    const output = writer.write([
      region(0, 0, [
        createCell({char: 'A', hyperlink: 'https://example.com'}),
        createCell({char: 'B'}),
      ]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B]8;;https://example.com\u0007A\u001B]8;;\u0007B');
  });

  it('carries style state across regions and emits only the needed delta', () => {
    const output = writer.write([
      region(0, 0, [createCell({char: 'A', fg: {r: 10, g: 20, b: 30}})]),
      region(4, 1, [createCell({char: 'B', fg: {r: 10, g: 20, b: 30}})]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[38;2;10;20;30mA\u001B[2;5HB');
  });

  it('wraps output in synchronized mode sequences when enabled', () => {
    writer.setSynchronizedOutputEnabled(true);

    const output = writer.write([region(0, 0, [createCell({char: 'A'})])]);

    expect(output).toBe('\u001B[?2026h\u001B[1;1HA\u001B[?2026l');
  });

  it('does not emit synchronized mode sequences when disabled', () => {
    writer.setSynchronizedOutputEnabled(false);

    const output = writer.write([region(0, 0, [createCell({char: 'A'})])]);

    expect(output).toBe('\u001B[1;1HA');
  });

  it('emits 256-color sequences when the color profile is ansi256', () => {
    writer.setColorProfile('ansi256');

    const output = writer.write([
      region(0, 0, [createCell({char: 'A', fg: {r: 255, g: 0, b: 0}, bg: {r: 0, g: 0, b: 255}})]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[38;5;196;48;5;21mA');
  });

  it('emits 16-color sequences when the color profile is ansi16', () => {
    writer.setColorProfile('ansi16');

    const output = writer.write([
      region(0, 0, [createCell({char: 'A', fg: {r: 255, g: 0, b: 0}, bg: {r: 0, g: 0, b: 255}})]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[91;104mA');
  });

  it('omits color output entirely when the color profile is none', () => {
    writer.setColorProfile('none');

    const output = writer.write([
      region(0, 0, [createCell({char: 'A', fg: {r: 255, g: 0, b: 0}, bold: true})]),
    ]);

    expect(output).toBe('\u001B[1;1H\u001B[1mA');
  });
});
