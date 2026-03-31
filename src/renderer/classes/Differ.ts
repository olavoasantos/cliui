import type {Cell, ChangedRegion} from '../types';
import {CellBuffer} from './CellBuffer';

/** Shared immutable empty cell used for out-of-bounds reads during diffing. */
const EMPTY_CELL: Readonly<Cell> = Object.freeze({
  char: ' ',
  fg: null,
  bg: null,
  bold: false,
  italic: false,
  underline: 'none' as const,
  underlineColor: null,
  strikethrough: false,
  faint: false,
  hyperlink: null,
});

/**
 * Computes row-local changed runs between two cell buffers.
 *
 * Each returned region represents a consecutive sequence of changed cells on a
 * single row. This keeps the diff shape aligned with efficient ANSI output,
 * where each run can be rendered with one cursor move followed by contiguous
 * cell writes.
 */
export class Differ {
  /**
   * Compares two buffers and returns the changed regions.
   *
   * The comparison spans the union of both buffer dimensions. Missing cells are
   * treated as empty cells so buffer growth and shrinkage still produce clear
   * operations where needed.
   *
   * Rows where neither buffer has been modified since the last dirty-flag
   * reset are skipped entirely.
   *
   * @param previous - Previously rendered buffer.
   * @param current - Newly rendered buffer.
   * @returns Consecutive changed regions grouped by row.
   */
  diff(previous: CellBuffer, current: CellBuffer): ChangedRegion[] {
    const regions: ChangedRegion[] = [];
    const rows = Math.max(previous.rows, current.rows);
    const cols = Math.max(previous.cols, current.cols);

    for (let y = 0; y < rows; y += 1) {
      if (!previous.isRowDirty(y) && !current.isRowDirty(y)) {
        continue;
      }

      let activeRegion: ChangedRegion | null = null;

      for (let x = 0; x < cols; x += 1) {
        const previousCell = previous.getRef(x, y) ?? EMPTY_CELL;
        const currentCell = current.getRef(x, y) ?? EMPTY_CELL;

        if (this.areCellsEqual(previousCell, currentCell)) {
          if (activeRegion !== null) {
            regions.push(activeRegion);
            activeRegion = null;
          }

          continue;
        }

        if (activeRegion === null) {
          activeRegion = {
            x,
            y,
            cells: [currentCell],
          };
        } else {
          activeRegion.cells.push(currentCell);
        }
      }

      if (activeRegion !== null) {
        regions.push(activeRegion);
      }
    }

    return regions;
  }

  private areCellsEqual(left: Readonly<Cell>, right: Readonly<Cell>): boolean {
    return (
      left.char === right.char &&
      this.areColorsEqual(left.fg, right.fg) &&
      this.areColorsEqual(left.bg, right.bg) &&
      left.bold === right.bold &&
      left.italic === right.italic &&
      left.underline === right.underline &&
      this.areColorsEqual(left.underlineColor, right.underlineColor) &&
      left.strikethrough === right.strikethrough &&
      left.faint === right.faint &&
      left.hyperlink === right.hyperlink
    );
  }

  private areColorsEqual(left: Cell['fg'], right: Cell['fg']): boolean {
    if (left === null || right === null) {
      return left === right;
    }

    return left.r === right.r && left.g === right.g && left.b === right.b;
  }
}
