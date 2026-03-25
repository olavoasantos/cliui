import {describe, expect, it} from 'vitest';

import type {Cell} from '../../types';
import {CellBuffer} from '../CellBuffer';

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

describe('CellBuffer', () => {
  describe('construction', () => {
    it('creates an empty buffer with the requested dimensions', () => {
      const buffer = new CellBuffer(3, 2);

      expect(buffer.cols).toBe(3);
      expect(buffer.rows).toBe(2);
      expect(buffer.get(0, 0)).toEqual(createCell());
      expect(buffer.get(2, 1)).toEqual(createCell());
    });

    it('clamps negative dimensions to zero', () => {
      const buffer = new CellBuffer(-1, -2);

      expect(buffer.cols).toBe(0);
      expect(buffer.rows).toBe(0);
    });
  });

  describe('get', () => {
    it('returns undefined for out-of-bounds reads', () => {
      const buffer = new CellBuffer(2, 2);

      expect(buffer.get(-1, 0)).toBeUndefined();
      expect(buffer.get(0, -1)).toBeUndefined();
      expect(buffer.get(2, 0)).toBeUndefined();
      expect(buffer.get(0, 2)).toBeUndefined();
    });

    it('returns a cloned cell snapshot', () => {
      const buffer = new CellBuffer(1, 1);
      buffer.set(0, 0, createCell({char: 'A', fg: {r: 1, g: 2, b: 3}}));

      const cell = buffer.get(0, 0)!;
      cell.char = 'B';
      cell.fg!.r = 9;

      expect(buffer.get(0, 0)).toEqual(createCell({char: 'A', fg: {r: 1, g: 2, b: 3}}));
    });
  });

  describe('set', () => {
    it('writes a cell at the given coordinates', () => {
      const buffer = new CellBuffer(2, 2);
      const cell = createCell({
        char: 'X',
        fg: {r: 255, g: 0, b: 0},
        bg: {r: 0, g: 0, b: 0},
        bold: true,
        underline: 'double',
      });

      buffer.set(1, 1, cell);

      expect(buffer.get(1, 1)).toEqual(cell);
    });

    it('ignores out-of-bounds writes', () => {
      const buffer = new CellBuffer(1, 1);

      buffer.set(2, 2, createCell({char: 'Z'}));

      expect(buffer.get(0, 0)).toEqual(createCell());
    });

    it('stores a clone of the provided cell', () => {
      const buffer = new CellBuffer(1, 1);
      const cell = createCell({char: 'Q', fg: {r: 10, g: 20, b: 30}});

      buffer.set(0, 0, cell);
      cell.char = 'R';
      cell.fg!.g = 99;

      expect(buffer.get(0, 0)).toEqual(createCell({char: 'Q', fg: {r: 10, g: 20, b: 30}}));
    });
  });

  describe('clear', () => {
    it('resets all cells to the empty-cell state', () => {
      const buffer = new CellBuffer(2, 2);
      buffer.set(0, 0, createCell({char: 'A', bold: true}));
      buffer.set(1, 1, createCell({char: 'B', italic: true}));

      buffer.clear();

      expect(buffer.get(0, 0)).toEqual(createCell());
      expect(buffer.get(1, 1)).toEqual(createCell());
    });
  });

  describe('resize', () => {
    it('preserves overlapping cells when growing', () => {
      const buffer = new CellBuffer(2, 2);
      buffer.set(0, 0, createCell({char: 'A'}));
      buffer.set(1, 1, createCell({char: 'B'}));

      buffer.resize(3, 3);

      expect(buffer.cols).toBe(3);
      expect(buffer.rows).toBe(3);
      expect(buffer.get(0, 0)).toEqual(createCell({char: 'A'}));
      expect(buffer.get(1, 1)).toEqual(createCell({char: 'B'}));
      expect(buffer.get(2, 2)).toEqual(createCell());
    });

    it('preserves the top-left overlap when shrinking', () => {
      const buffer = new CellBuffer(3, 3);
      buffer.set(0, 0, createCell({char: 'A'}));
      buffer.set(2, 2, createCell({char: 'Z'}));

      buffer.resize(2, 2);

      expect(buffer.cols).toBe(2);
      expect(buffer.rows).toBe(2);
      expect(buffer.get(0, 0)).toEqual(createCell({char: 'A'}));
      expect(buffer.get(1, 1)).toEqual(createCell());
      expect(buffer.get(2, 2)).toBeUndefined();
    });
  });
});
