import type {Editable} from '../types/Editable';

const DEFAULT_BLINK_INTERVAL = 530;

/**
 * A single caret instance tracking cursor position, blink state, and
 * text selection for one editable element.
 *
 * The caret delegates content operations (insert, delete, read) to its
 * `Editable` target.  Cursor position is authoritative on the editable;
 * the caret mirrors it and keeps blink/selection state in sync.
 */
export class Caret {
  /** The editable element this caret is bound to. */
  readonly target: Editable;

  /** Selection anchor as a grapheme index, or -1 when no selection. */
  private selectionAnchor = -1;

  /** Whether the cursor is in the visible blink phase. */
  private blinkVisible = true;

  /** Timestamp of the last blink toggle. */
  private lastBlinkTimestamp: number | null = null;

  /** Blink interval in milliseconds. */
  private readonly blinkInterval: number;

  constructor(target: Editable, blinkInterval = DEFAULT_BLINK_INTERVAL) {
    this.target = target;
    this.blinkInterval = blinkInterval;
  }

  /** Whether the cursor blink is currently in the visible phase. */
  get cursorVisible(): boolean {
    return this.blinkVisible;
  }

  /** Current cursor position as a grapheme index. */
  get position(): number {
    return this.target.getCursorPosition();
  }

  /** Whether a text selection is active. */
  hasSelection(): boolean {
    return this.selectionAnchor >= 0 && this.selectionAnchor !== this.position;
  }

  /**
   * Returns the selected range as `[start, end)`, sorted.
   * Returns `null` when there is no selection.
   */
  getSelectedRange(): [number, number] | null {
    if (!this.hasSelection()) return null;

    const a = this.selectionAnchor;
    const b = this.position;

    return a < b ? [a, b] : [b, a];
  }

  /**
   * Advances the blink timer.  Call once per frame.
   *
   * @returns `true` if the blink phase changed (the caller should re-render).
   */
  tick(timestamp: number): boolean {
    if (this.target.isDisabled()) return false;

    if (this.lastBlinkTimestamp === null) {
      this.lastBlinkTimestamp = timestamp;
      return false;
    }

    const elapsed = timestamp - this.lastBlinkTimestamp;

    if (elapsed >= this.blinkInterval) {
      this.blinkVisible = !this.blinkVisible;
      this.lastBlinkTimestamp = timestamp;
      return true;
    }

    return false;
  }

  /** Resets the blink to the visible phase (e.g. after a keystroke). */
  resetBlink(): void {
    this.blinkVisible = true;
    this.lastBlinkTimestamp = null;
  }

  /**
   * Moves the cursor to the given position, clearing any selection.
   */
  moveTo(position: number): void {
    const clamped = Math.max(0, Math.min(position, this.target.getGraphemes().length));
    this.target.setCursorPosition(clamped);
    this.selectionAnchor = -1;
    this.target.updateScroll();
    this.resetBlink();
  }

  /**
   * Extends (or starts) the selection to the given position.
   * The anchor stays where it was when the selection began.
   */
  selectTo(position: number): void {
    if (this.selectionAnchor < 0) {
      this.selectionAnchor = this.position;
    }

    const clamped = Math.max(0, Math.min(position, this.target.getGraphemes().length));
    this.target.setCursorPosition(clamped);
    this.target.updateScroll();
    this.resetBlink();
  }

  /** Clears the selection without moving the cursor. */
  clearSelection(): void {
    this.selectionAnchor = -1;
  }

  /**
   * Returns the text content of the current selection.
   * Returns an empty string when there is no selection.
   */
  getSelectedText(): string {
    const range = this.getSelectedRange();
    if (!range) return '';

    return this.target.getGraphemes().slice(range[0], range[1]).join('');
  }

  /**
   * Replaces the current selection (or inserts at cursor) with text.
   * No-op if the target is readonly or disabled.
   */
  insertText(text: string): void {
    if (this.target.isReadonly() || this.target.isDisabled()) return;

    if (this.hasSelection()) {
      const [start, end] = this.getSelectedRange()!;
      this.target.setCursorPosition(start);
      this.target.deleteRange(start, end);
      this.selectionAnchor = -1;
    }

    this.target.insertText(text);
    this.target.updateScroll();
    this.resetBlink();
  }

  /**
   * Deletes the current selection.  Returns `true` if something was
   * deleted, `false` otherwise.
   */
  deleteSelection(): boolean {
    if (!this.hasSelection()) return false;
    if (this.target.isReadonly() || this.target.isDisabled()) return false;

    const [start, end] = this.getSelectedRange()!;
    this.target.setCursorPosition(start);
    this.target.deleteRange(start, end);
    this.selectionAnchor = -1;
    this.target.updateScroll();
    this.resetBlink();

    return true;
  }
}
