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
   * Per-row dirty flags. A row is marked dirty when any cell in it is
   * written via {@link set} or {@link setDirect}. Consumers like the
   * {@link Differ} can use {@link isRowDirty} to skip unchanged rows.
   */
  private dirtyRows: Uint8Array;

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
    this.dirtyRows = new Uint8Array(this.rows);
  }

  /**
   * Returns a cloned snapshot of the cell at the given coordinates.
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
   * Returns a direct reference to the internal cell at the given
   * coordinates without cloning.
   *
   * The caller **must not mutate** the returned cell. This method exists
   * for read-only hot paths (diffing, ANSI serialization) that need to
   * avoid allocation overhead.
   *
   * Out-of-bounds reads return `undefined`.
   *
   * @param x - Column coordinate.
   * @param y - Row coordinate.
   * @returns The internal cell reference, or `undefined` if out of bounds.
   */
  getRef(x: number, y: number): Cell | undefined {
    const index = this.getIndex(x, y);

    if (index === null) {
      return undefined;
    }

    return this.cells[index];
  }

  /**
   * Replaces the cell at the given coordinates by cloning the input.
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
    this.dirtyRows[Math.floor(y)] = 1;
  }

  /**
   * Writes cell properties directly into the internal cell at the given
   * coordinates, avoiding object allocation entirely.
   *
   * Out-of-bounds writes are ignored.
   *
   * @param x - Column coordinate.
   * @param y - Row coordinate.
   * @param cell - The cell value whose properties are copied in.
   */
  setDirect(x: number, y: number, cell: Cell): void {
    const index = this.getIndex(x, y);

    if (index === null) {
      return;
    }

    const target = this.cells[index]!;

    target.char = cell.char;
    target.bold = cell.bold;
    target.italic = cell.italic;
    target.underline = cell.underline;
    target.strikethrough = cell.strikethrough;
    target.faint = cell.faint;
    target.hyperlink = cell.hyperlink;

    if (cell.fg === null) {
      target.fg = null;
    } else if (target.fg === null) {
      target.fg = {r: cell.fg.r, g: cell.fg.g, b: cell.fg.b};
    } else {
      target.fg.r = cell.fg.r;
      target.fg.g = cell.fg.g;
      target.fg.b = cell.fg.b;
    }

    if (cell.bg === null) {
      target.bg = null;
    } else if (target.bg === null) {
      target.bg = {r: cell.bg.r, g: cell.bg.g, b: cell.bg.b};
    } else {
      target.bg.r = cell.bg.r;
      target.bg.g = cell.bg.g;
      target.bg.b = cell.bg.b;
    }

    if (cell.underlineColor === null) {
      target.underlineColor = null;
    } else if (target.underlineColor === null) {
      target.underlineColor = {
        r: cell.underlineColor.r,
        g: cell.underlineColor.g,
        b: cell.underlineColor.b,
      };
    } else {
      target.underlineColor.r = cell.underlineColor.r;
      target.underlineColor.g = cell.underlineColor.g;
      target.underlineColor.b = cell.underlineColor.b;
    }

    this.dirtyRows[Math.floor(y)] = 1;
  }

  /**
   * Returns whether the given row has been modified since the last
   * {@link clearDirtyRows} call.
   *
   * @param y - Row index.
   */
  isRowDirty(y: number): boolean {
    return y >= 0 && y < this.rows && this.dirtyRows[y] === 1;
  }

  /**
   * Resets all row dirty flags. Typically called after diffing.
   */
  clearDirtyRows(): void {
    this.dirtyRows.fill(0);
  }

  /**
   * Marks all rows as dirty so the next diff considers every cell.
   */
  markAllRowsDirty(): void {
    this.dirtyRows.fill(1);
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
    this.dirtyRows = new Uint8Array(nextRows);
    this.dirtyRows.fill(1);
  }

  /**
   * Resets every cell in the buffer to the empty-cell state in place,
   * avoiding allocation of new cell objects.
   */
  clear(): void {
    for (let i = 0; i < this.cells.length; i += 1) {
      const cell = this.cells[i]!;

      cell.char = ' ';
      cell.fg = null;
      cell.bg = null;
      cell.bold = false;
      cell.italic = false;
      cell.underline = 'none';
      cell.underlineColor = null;
      cell.strikethrough = false;
      cell.faint = false;
      cell.hyperlink = null;
    }

    this.dirtyRows.fill(0);
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
    const cells = new Array<Cell>(count);

    for (let i = 0; i < count; i += 1) {
      cells[i] = {
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

    return cells;
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
