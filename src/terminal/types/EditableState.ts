import type {Caret} from '../classes/Caret';

/**
 * System-managed editing state for an element with `[EDITABLE]`.
 *
 * Created on focus, torn down on blur. The terminal editing system
 * owns this state — components do not interact with it directly.
 */
export interface EditableState {
  /** The grapheme array representing the editable content. */
  graphemes: string[];

  /** Cursor position as a flat grapheme index. */
  cursorPosition: number;

  /** Horizontal scroll offset as a grapheme index. */
  scrollX: number;

  /** Vertical scroll offset as a visual line index. */
  scrollY: number;

  /** Whether the element currently has focus. */
  isFocused: boolean;

  /** Value snapshot taken on focus, used for change detection on blur. */
  valueAtFocus: string;

  /** The active caret managed by the CaretManager. */
  caret: Caret | null;

  /**
   * Resolved viewport width from the element's layout content area.
   * Updated each frame by the terminal system. Falls back to
   * `intrinsicWidth()` before the first layout pass.
   */
  resolvedWidth: number;

  /**
   * Resolved viewport height from the element's layout content area.
   * Updated each frame by the terminal system. Falls back to
   * `intrinsicHeight()` before the first layout pass.
   */
  resolvedHeight: number;
}
