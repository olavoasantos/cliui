/**
 * Screen-space caret and selection data produced by the `CaretManager`
 * for the renderer to overlay onto the cell buffer.
 */
export interface CaretOverlay {
  /** Screen x coordinate of the cursor cell. */
  cursorX: number;

  /** Screen y coordinate of the cursor cell. */
  cursorY: number;

  /** Whether the cursor is in the visible blink phase. */
  cursorVisible: boolean;

  /** Selected cell ranges to highlight (inverted bg/fg). */
  selection: CaretSelectionRange[];
}

/** A contiguous horizontal range of selected cells on a single row. */
export interface CaretSelectionRange {
  /** Screen x coordinate of the first selected cell. */
  x: number;

  /** Screen y coordinate of the row. */
  y: number;

  /** Number of cells in this range. */
  width: number;
}
