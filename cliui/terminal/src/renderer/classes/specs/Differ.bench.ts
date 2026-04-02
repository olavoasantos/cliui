import {bench, describe} from 'vitest';

import type {Cell} from '../../types';
import {CellBuffer} from '../CellBuffer';
import {Differ} from '../Differ';

function createCell(char: string, fg = 255): Cell {
  return {
    char,
    fg: {r: fg, g: fg, b: fg},
    bg: null,
    bold: false,
    italic: false,
    underline: 'none',
    underlineColor: null,
    strikethrough: false,
    faint: false,
    hyperlink: null,
  };
}

function createScenario(cols: number, rows: number, dense: boolean): {diff(): void} {
  const differ = new Differ();
  const previous = new CellBuffer(cols, rows);
  const current = new CellBuffer(cols, rows);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      previous.set(x, y, createCell((x + y) % 2 === 0 ? 'a' : 'b', 120));
      const changed = dense ? (x + y) % 3 !== 0 : x % 9 === 0 && y % 3 === 0;
      current.set(
        x,
        y,
        changed ? createCell('x', 200) : createCell((x + y) % 2 === 0 ? 'a' : 'b', 120),
      );
    }
  }

  return {
    diff() {
      differ.diff(previous, current);
    },
  };
}

const sparseScenario = createScenario(120, 32, false);
const denseScenario = createScenario(120, 32, true);

describe('Differ', () => {
  bench('diffs sparse frame changes across a terminal-sized buffer', () => {
    sparseScenario.diff();
  });

  bench('diffs dense frame changes across a terminal-sized buffer', () => {
    denseScenario.diff();
  });
});
