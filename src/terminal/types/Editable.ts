import type {Element} from '../../dom/classes/Element';
import type {VisualLineCache} from '../utilities/cachedComputeVisualLines';

/**
 * Internal contract used by the caret system to interact with editable
 * text content.
 *
 * Components do not implement this directly. Instead, they declare an
 * `[EDITABLE]` configuration symbol and the terminal system creates
 * bridge objects that implement this interface internally.
 */
export interface Editable {
  /** Returns the grapheme array representing the editable content. */
  getGraphemes(): string[];

  /** Returns the current cursor position as a grapheme index. */
  getCursorPosition(): number;

  /** Sets the cursor position as a grapheme index. */
  setCursorPosition(position: number): void;

  /** Inserts text at the current cursor position. */
  insertText(text: string): void;

  /** Deletes graphemes in the range `[start, end)`. */
  deleteRange(start: number, end: number): void;

  /** Returns the display width of the editable region in terminal cells. */
  getEditableWidth(): number;

  /** Returns the scroll offset as a grapheme index (for horizontal scrolling). */
  getScrollOffset(): number;

  /** Returns the vertical scroll offset as a visual line index. */
  getScrollY(): number;

  /** Updates the scroll offset to keep the cursor visible. */
  updateScroll(): void;

  /** Whether the element is readonly (cursor movement allowed, edits blocked). */
  isReadonly(): boolean;

  /** Whether the element is disabled (no interaction). */
  isDisabled(): boolean;

  /** Returns the underlying DOM element. */
  getElement(): Element;

  /** Returns the visual line cache for avoiding redundant computeVisualLines calls. */
  getVisualLineCache(): VisualLineCache;
}
