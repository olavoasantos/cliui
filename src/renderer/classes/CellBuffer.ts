import type {Cell} from '../types';

/**
 * Stores a rectangular grid of terminal cells for a render frame.
 *
 * The buffer is addressed in terminal coordinates (`x`, `y`) where `x`
 * increases left-to-right and `y` increases top-to-bottom. All reads and
 * writes are clipped to the current bounds.
 */
export class CellBuffer {
  /** The current number of columns in the buffer. */
  cols: number;

  /** The current number of rows in the buffer. */
  rows: number;

  private cells: Cell[];

  /**
   * Creates a new buffer sized to the given terminal dimensions.
   *
   * @param cols - Number of columns.
   * @param rows - Number of rows.
   */
  constructor(cols: number, rows: number) {
    this.cols = Math.max(0, Math.floor(cols));
    this.rows = Math.max(0, Math.floor(rows));
    this.cells = this.createCells(this.cols * this.rows);
  }

  /**
   * Returns the cell at the given coordinates.
   *
   * Out-of-bounds reads return `undefined`.
   *
   * @param x - Column coordinate.
   * @param y - Row coordinate.
   * @returns A cloned cell snapshot if present.
   */
  get(x: number, y: number): Cell | undefined {
    const index = this.getIndex(x, y);

    if (index === null) {
      return undefined;
    }

    return this.cloneCell(this.cells[index]!);
  }

  /**
   * Replaces the cell at the given coordinates.
   *
   * Out-of-bounds writes are ignored.
   *
   * @param x - Column coordinate.
   * @param y - Row coordinate.
   * @param cell - The cell value to write.
   */
  set(x: number, y: number, cell: Cell): void {
    const index = this.getIndex(x, y);

    if (index === null) {
      return;
    }

    this.cells[index] = this.cloneCell(cell);
  }

  /**
   * Resizes the buffer to new dimensions.
   *
   * Cells in the overlapping top-left region are preserved. New cells are
   * initialized to the empty-cell state.
   *
   * @param cols - New column count.
   * @param rows - New row count.
   */
  resize(cols: number, rows: number): void {
    const nextCols = Math.max(0, Math.floor(cols));
    const nextRows = Math.max(0, Math.floor(rows));
    const nextCells = this.createCells(nextCols * nextRows);
    const overlapCols = Math.min(this.cols, nextCols);
    const overlapRows = Math.min(this.rows, nextRows);

    for (let y = 0; y < overlapRows; y += 1) {
      for (let x = 0; x < overlapCols; x += 1) {
        const previousIndex = y * this.cols + x;
        const nextIndex = y * nextCols + x;

        nextCells[nextIndex] = this.cloneCell(this.cells[previousIndex]!);
      }
    }

    this.cols = nextCols;
    this.rows = nextRows;
    this.cells = nextCells;
  }

  /**
   * Resets every cell in the buffer to the empty-cell state.
   */
  clear(): void {
    this.cells = this.createCells(this.cols * this.rows);
  }

  private getIndex(x: number, y: number): number | null {
    const normalizedX = Math.floor(x);
    const normalizedY = Math.floor(y);

    if (
      normalizedX < 0 ||
      normalizedY < 0 ||
      normalizedX >= this.cols ||
      normalizedY >= this.rows
    ) {
      return null;
    }

    return normalizedY * this.cols + normalizedX;
  }

  private createCells(count: number): Cell[] {
    return Array.from({length: count}, () => this.createEmptyCell());
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

  private cloneCell(cell: Cell): Cell {
    return {
      ...cell,
      fg: cell.fg === null ? null : {...cell.fg},
      bg: cell.bg === null ? null : {...cell.bg},
      underlineColor: cell.underlineColor === null ? null : {...cell.underlineColor},
    };
  }
}
