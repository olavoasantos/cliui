import styles from './styles.css?inline';

import {
  DEFAULT_UI_INPUT_WIDTH,
  MIN_UI_INPUT_WIDTH,
  UI_INPUT_OBSERVED_ATTRIBUTES,
  UI_INPUT_TAG_NAME,
} from './constants';
import {ClipboardEvent, Event, HTMLElement, InputEvent} from '../../dom';
import {cellWidth} from '../../layout/utilities/cellWidth';

import type {Element} from '../../dom/classes/Element';
import type {Editable} from '../../terminal/types/Editable';
import type {Caret} from '../../terminal/classes/Caret';

/**
 * Built-in single-line text input custom element.
 *
 * Implements the `Editable` interface so the centralized caret system
 * can manage cursor rendering, blink, and standard editing keybindings.
 *
 * Register with `window.customElements.define(UiInput.tagName, UiInput)`
 * before creating `<ui-input>` elements in a window.
 */
export class UiInput extends HTMLElement implements Editable {
  static override readonly observedAttributes = UI_INPUT_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_INPUT_TAG_NAME;

  /** Internal grapheme array representing the editable value. */
  private graphemes: string[] = [];

  /** Cursor position as a grapheme index. */
  private cursorPosition = 0;

  /** Scroll offset as a grapheme index for horizontal scrolling. */
  private scrollOffset = 0;

  /** Whether the element currently has focus. */
  private isFocused = false;

  /** Value snapshot taken on focus, used for change detection on blur. */
  private valueAtFocus = '';

  /** Active caret managed by CaretManager, set on focus. */
  private activeCaret: Caret | null = null;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundPaste = this.handlePaste.bind(this) as EventListener;
  private readonly boundFocus = this.handleFocus.bind(this) as EventListener;
  private readonly boundBlur = this.handleBlur.bind(this) as EventListener;
  private readonly boundMouseDown = this.handleMouseDown.bind(this) as EventListener;

  connectedCallback(): void {
    this.syncValueFromAttribute();
    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('paste', this.boundPaste);
    this.addEventListener('focus', this.boundFocus);
    this.addEventListener('blur', this.boundBlur);
    this.addEventListener('mousedown', this.boundMouseDown);
    this.render();
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('paste', this.boundPaste);
    this.removeEventListener('focus', this.boundFocus);
    this.removeEventListener('blur', this.boundBlur);
    this.removeEventListener('mousedown', this.boundMouseDown);
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'value') {
      this.syncValueFromAttribute();
    }

    this.render();
  }

  /* ── Editable interface ─────────────────────────────────── */

  getGraphemes(): string[] {
    return this.graphemes;
  }

  getCursorPosition(): number {
    return this.cursorPosition;
  }

  setCursorPosition(position: number): void {
    this.cursorPosition = Math.max(0, Math.min(position, this.graphemes.length));
  }

  insertText(text: string): void {
    const sanitized = text.replace(/[\n\r\t]/g, ' ');
    const newGraphemes = this.segmentGraphemes(sanitized);

    if (newGraphemes.length === 0) return;

    const maxLength = this.getMaxLength();

    if (maxLength > 0) {
      const available = maxLength - this.graphemes.length;

      if (available <= 0) return;

      if (newGraphemes.length > available) {
        newGraphemes.length = available;
      }
    }

    this.graphemes.splice(this.cursorPosition, 0, ...newGraphemes);
    this.cursorPosition += newGraphemes.length;
    this.syncAttributeFromValue();
    this.dispatchInputEvent(sanitized, 'insertText');
  }

  deleteRange(start: number, end: number): void {
    this.graphemes.splice(start, end - start);
    this.cursorPosition = Math.min(this.cursorPosition, this.graphemes.length);
    this.syncAttributeFromValue();
    this.dispatchInputEvent(null, 'deleteContentBackward');
  }

  getEditableWidth(): number {
    return this.getWidth();
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  updateScroll(): void {
    this.handleOverflow();
    this.render();
  }

  isReadonly(): boolean {
    return this.hasAttribute('readonly');
  }

  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  getElement(): Element {
    return this;
  }

  /* ── Caret management ───────────────────────────────────── */

  /** Sets the active caret (called by CaretManager on focus). */
  setCaret(caret: Caret | null): void {
    this.activeCaret = caret;
  }

  /** Returns the active caret, if any. */
  getCaret(): Caret | null {
    return this.activeCaret;
  }

  /* ── Private ────────────────────────────────────────────── */

  /**
   * Handles component-specific keys that the caret system doesn't cover.
   */
  private handleKeyDown(event: Event): void {
    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key === 'Escape') {
      const doc = this.ownerDocument as import('../../dom').Document;
      doc.setActiveElement(null);
    }
  }

  private handlePaste(event: Event): void {
    if (this.isDisabled() || this.isReadonly()) return;

    const clipboardEvent = event as ClipboardEvent;
    const text = clipboardEvent.clipboardData?.getData('text/plain') ?? '';

    if (text.length > 0 && this.activeCaret) {
      this.activeCaret.insertText(text);
    }
  }

  private handleFocus(): void {
    this.isFocused = true;
    this.valueAtFocus = this.getValue();
    this.render();
  }

  private handleBlur(): void {
    const currentValue = this.getValue();

    this.isFocused = false;
    this.activeCaret = null;
    this.render();

    if (currentValue !== this.valueAtFocus) {
      this.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }

  private handleMouseDown(event: Event): void {
    if (this.isDisabled()) return;

    event.preventDefault();

    const doc = this.ownerDocument as import('../../dom').Document;
    doc.setActiveElement(this);

    const mouseEvent = event as import('../../dom').MouseEvent;
    const localX = mouseEvent.offsetX ?? 0;
    const shift = mouseEvent.shiftKey ?? false;

    let currentWidth = 0;
    let targetGraphemeIndex = this.scrollOffset;

    for (let i = this.scrollOffset; i < this.graphemes.length; i++) {
      const graphemeWidth = cellWidth(this.graphemes[i]!);

      if (currentWidth + graphemeWidth / 2 >= localX) break;

      currentWidth += graphemeWidth;
      targetGraphemeIndex = i + 1;
    }

    if (this.activeCaret) {
      if (shift) {
        this.activeCaret.selectTo(targetGraphemeIndex);
      } else {
        this.activeCaret.moveTo(targetGraphemeIndex);
      }
    } else {
      this.setCursorPosition(targetGraphemeIndex);
      this.handleOverflow();
      this.render();
    }
  }

  private dispatchInputEvent(data: string | null, inputType: string): void {
    this.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        data,
        inputType,
      }),
    );
  }

  private handleOverflow(): void {
    const width = this.getWidth();

    if (this.cursorPosition < this.scrollOffset) {
      this.scrollOffset = this.cursorPosition;
      return;
    }

    let visibleWidth = 0;
    let visibleEnd = this.scrollOffset;

    for (let index = this.scrollOffset; index < this.graphemes.length; index += 1) {
      const graphemeWidth = cellWidth(this.graphemes[index]!);

      if (visibleWidth + graphemeWidth > width) break;

      visibleWidth += graphemeWidth;
      visibleEnd = index + 1;
    }

    if (this.cursorPosition > visibleEnd) {
      let widthFromCursor = 0;
      let newOffset = this.cursorPosition;

      for (let index = this.cursorPosition - 1; index >= 0; index -= 1) {
        const graphemeWidth = cellWidth(this.graphemes[index]!);

        if (widthFromCursor + graphemeWidth > width) break;

        widthFromCursor += graphemeWidth;
        newOffset = index;
      }

      this.scrollOffset = newOffset;
    }
  }

  /**
   * Renders the visible text content.  The cursor is NOT rendered here —
   * the caret system paints it as an overlay in the cell buffer.
   */
  private render(): void {
    const width = this.getWidth();

    if (this.graphemes.length === 0 && !this.isFocused) {
      const placeholder = this.getPlaceholder();

      if (placeholder.length > 0) {
        this.textContent = this.truncateToWidth(placeholder, width);
        return;
      }

      this.textContent = ' '.repeat(width);
      return;
    }

    if (this.graphemes.length === 0) {
      this.textContent = ' '.repeat(width);
      return;
    }

    let output = '';
    let outputWidth = 0;

    for (let index = this.scrollOffset; index < this.graphemes.length; index += 1) {
      const grapheme = this.graphemes[index]!;
      const graphemeWidth = cellWidth(grapheme);

      if (outputWidth + graphemeWidth > width) break;

      output += grapheme;
      outputWidth += graphemeWidth;
    }

    if (outputWidth < width) {
      output += ' '.repeat(width - outputWidth);
    }

    this.textContent = output;
  }

  private getValue(): string {
    return this.graphemes.join('');
  }

  private syncValueFromAttribute(): void {
    const attrValue = this.getAttribute('value') ?? '';
    const graphemes = this.segmentGraphemes(attrValue);

    if (this.getValue() === attrValue) return;

    this.graphemes = graphemes;
    this.cursorPosition = Math.min(this.cursorPosition, this.graphemes.length);
    this.handleOverflow();
  }

  private syncAttributeFromValue(): void {
    const value = this.getValue();
    const current = this.getAttribute('value');

    if (current !== value) {
      this.setAttribute('value', value);
    }
  }

  private segmentGraphemes(text: string): string[] {
    const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
    return [...segmenter.segment(text)].map((segment) => segment.segment);
  }

  private truncateToWidth(text: string, maxWidth: number): string {
    const graphemes = this.segmentGraphemes(text);
    let result = '';
    let width = 0;

    for (const grapheme of graphemes) {
      const w = cellWidth(grapheme);

      if (width + w > maxWidth) break;

      result += grapheme;
      width += w;
    }

    if (width < maxWidth) {
      result += ' '.repeat(maxWidth - width);
    }

    return result;
  }

  private getWidth(): number {
    const rawWidth = this.getAttribute('width');

    if (rawWidth == null) return DEFAULT_UI_INPUT_WIDTH;

    const parsed = Number.parseInt(rawWidth, 10);

    if (!Number.isFinite(parsed) || parsed < MIN_UI_INPUT_WIDTH) {
      return DEFAULT_UI_INPUT_WIDTH;
    }

    return parsed;
  }

  private getPlaceholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  private getMaxLength(): number {
    const rawMax = this.getAttribute('maxlength');

    if (rawMax == null) return 0;

    const parsed = Number.parseInt(rawMax, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
}
