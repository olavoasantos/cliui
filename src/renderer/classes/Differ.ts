import type {Cell, ChangedRegion} from '../types';
import {CellBuffer} from './CellBuffer';

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
   * @param previous - Previously rendered buffer.
   * @param current - Newly rendered buffer.
   * @returns Consecutive changed regions grouped by row.
   */
  diff(previous: CellBuffer, current: CellBuffer): ChangedRegion[] {
    const regions: ChangedRegion[] = [];
    const rows = Math.max(previous.rows, current.rows);
    const cols = Math.max(previous.cols, current.cols);

    for (let y = 0; y < rows; y += 1) {
      let activeRegion: ChangedRegion | null = null;

      for (let x = 0; x < cols; x += 1) {
        const previousCell = previous.get(x, y) ?? this.createEmptyCell();
        const currentCell = current.get(x, y) ?? this.createEmptyCell();

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

  private areCellsEqual(left: Cell, right: Cell): boolean {
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

  private createEmptyCell(): Cell {
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
    };
  }
}
