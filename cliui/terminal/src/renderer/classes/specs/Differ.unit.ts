import {describe, expect, it} from 'vitest';

import type {Cell} from '../../types';
import {CellBuffer} from '../CellBuffer';
import {Differ} from '../Differ';

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

describe('Differ', () => {
  const differ = new Differ();

  it('returns no regions for identical buffers', () => {
    const previous = new CellBuffer(3, 2);
    const current = new CellBuffer(3, 2);

    expect(differ.diff(previous, current)).toEqual([]);
  });

  it('returns one region per row for a full-buffer change', () => {
    const previous = new CellBuffer(3, 2);
    const current = new CellBuffer(3, 2);

    current.set(0, 0, createCell({char: 'a'}));
    current.set(1, 0, createCell({char: 'b'}));
    current.set(2, 0, createCell({char: 'c'}));
    current.set(0, 1, createCell({char: 'd'}));
    current.set(1, 1, createCell({char: 'e'}));
    current.set(2, 1, createCell({char: 'f'}));

    expect(differ.diff(previous, current)).toEqual([
      {
        x: 0,
        y: 0,
        cells: [createCell({char: 'a'}), createCell({char: 'b'}), createCell({char: 'c'})],
      },
      {
        x: 0,
        y: 1,
        cells: [createCell({char: 'd'}), createCell({char: 'e'}), createCell({char: 'f'})],
      },
    ]);
  });

  it('returns sparse individual regions for separated changes', () => {
    const previous = new CellBuffer(5, 1);
    const current = new CellBuffer(5, 1);

    current.set(0, 0, createCell({char: 'A'}));
    current.set(2, 0, createCell({char: 'B'}));
    current.set(4, 0, createCell({char: 'C'}));

    expect(differ.diff(previous, current)).toEqual([
      {x: 0, y: 0, cells: [createCell({char: 'A'})]},
      {x: 2, y: 0, cells: [createCell({char: 'B'})]},
      {x: 4, y: 0, cells: [createCell({char: 'C'})]},
    ]);
  });

  it('merges consecutive changed cells into a single row run', () => {
    const previous = new CellBuffer(6, 1);
    const current = new CellBuffer(6, 1);

    current.set(1, 0, createCell({char: 'x'}));
    current.set(2, 0, createCell({char: 'y'}));
    current.set(3, 0, createCell({char: 'z'}));

    expect(differ.diff(previous, current)).toEqual([
      {
        x: 1,
        y: 0,
        cells: [createCell({char: 'x'}), createCell({char: 'y'}), createCell({char: 'z'})],
      },
    ]);
  });

  it('splits row-spanning changes into separate row-local regions', () => {
    const previous = new CellBuffer(2, 2);
    const current = new CellBuffer(2, 2);

    current.set(1, 0, createCell({char: 'A'}));
    current.set(0, 1, createCell({char: 'B'}));

    expect(differ.diff(previous, current)).toEqual([
      {x: 1, y: 0, cells: [createCell({char: 'A'})]},
      {x: 0, y: 1, cells: [createCell({char: 'B'})]},
    ]);
  });

  it('detects style-only changes even when characters stay the same', () => {
    const previous = new CellBuffer(1, 1);
    const current = new CellBuffer(1, 1);

    previous.set(0, 0, createCell({char: 'A'}));
    current.set(0, 0, createCell({char: 'A', bold: true}));

    expect(differ.diff(previous, current)).toEqual([
      {x: 0, y: 0, cells: [createCell({char: 'A', bold: true})]},
    ]);
  });
});
