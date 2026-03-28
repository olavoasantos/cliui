import type {Element} from '../../dom/classes/Element';

/**
 * Contract for DOM elements that support text editing with a caret.
 *
 * Input components (`<ui-input>`, `<ui-textarea>`, etc.) implement this
 * interface so the centralized caret system can read their content,
 * move the cursor, and perform edits without knowing the component's
 * internal structure.
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

  /** Updates the scroll offset to keep the cursor visible. */
  updateScroll(): void;

  /** Whether the element is readonly (cursor movement allowed, edits blocked). */
  isReadonly(): boolean;

  /** Whether the element is disabled (no interaction). */
  isDisabled(): boolean;

  /** Returns the underlying DOM element. */
  getElement(): Element;
}
