import styles from './styles.css?inline';

import {
  DEFAULT_UI_INPUT_WIDTH,
  MIN_UI_INPUT_WIDTH,
  UI_INPUT_CURSOR_BLINK_INTERVAL,
  UI_INPUT_CURSOR_CHAR,
  UI_INPUT_OBSERVED_ATTRIBUTES,
  UI_INPUT_TAG_NAME,
} from './constants';
import {ClipboardEvent, Event, HTMLElement, InputEvent, KeyboardEvent} from '../../dom';
import {cellWidth} from '../../layout/utilities/cellWidth';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';

/**
 * Built-in single-line text input custom element.
 *
 * Register with `window.customElements.define(UiInput.tagName, UiInput)`
 * before creating `<ui-input>` elements in a window.
 */
export class UiInput extends HTMLElement implements TerminalFrameAware {
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

  /** Whether the cursor blink is currently in the visible phase. */
  private cursorVisible = true;

  /** Timestamp of the last cursor blink toggle. */
  private lastBlinkTimestamp: number | null = null;

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

  /**
   * Advances cursor blink state in response to terminal frame ticks.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (!this.isFocused || this.isDisabled()) {
      return;
    }

    if (this.lastBlinkTimestamp === null) {
      this.lastBlinkTimestamp = timestamp;
      return;
    }

    const elapsed = timestamp - this.lastBlinkTimestamp;

    if (elapsed >= UI_INPUT_CURSOR_BLINK_INTERVAL) {
      this.cursorVisible = !this.cursorVisible;
      this.lastBlinkTimestamp = timestamp;
      this.render();
    }
  }

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) {
      return;
    }

    const keyEvent = event as KeyboardEvent;

    if (this.isReadonly()) {
      this.handleReadonlyKeyDown(keyEvent);
      return;
    }

    this.handleEditableKeyDown(keyEvent);
  }

  private handleReadonlyKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.moveCursorLeft();
        break;
      case 'ArrowRight':
        this.moveCursorRight();
        break;
      case 'Home':
        this.moveCursorToStart();
        break;
      case 'End':
        this.moveCursorToEnd();
        break;
      case 'Escape':
        this.blurSelf();
        break;
    }
  }

  private handleEditableKeyDown(event: KeyboardEvent): void {
    const alt = (event as unknown as {altKey: boolean}).altKey;
    const ctrl = (event as unknown as {ctrlKey: boolean}).ctrlKey;
    const meta = (event as unknown as {metaKey: boolean}).metaKey;
    const {key} = event;

    if (key === 'Escape') {
      this.blurSelf();
      return;
    }

    // Word delete backward: Alt+Backspace or Ctrl+W
    if ((key === 'Backspace' && alt) || (key === 'w' && ctrl)) {
      this.deleteWordBackward();
      return;
    }

    // Word delete forward: Alt+Delete or Alt+D
    if ((key === 'Delete' && alt) || (key === 'd' && alt)) {
      this.deleteWordForward();
      return;
    }

    // Delete to line start: Ctrl+U
    if (key === 'u' && ctrl) {
      this.deleteToLineStart();
      return;
    }

    // Delete to line end: Ctrl+K
    if (key === 'k' && ctrl) {
      this.deleteToLineEnd();
      return;
    }

    // Word left: Alt+ArrowLeft or Alt+B
    if ((key === 'ArrowLeft' && alt) || (key === 'b' && alt)) {
      this.moveCursorWordLeft();
      return;
    }

    // Word right: Alt+ArrowRight or Alt+F
    if ((key === 'ArrowRight' && alt) || (key === 'f' && alt)) {
      this.moveCursorWordRight();
      return;
    }

    // Char forward: Ctrl+F
    if (key === 'f' && ctrl) {
      this.moveCursorRight();
      return;
    }

    // Char backward: Ctrl+B
    if (key === 'b' && ctrl) {
      this.moveCursorLeft();
      return;
    }

    // Line start: Ctrl+A
    if (key === 'a' && ctrl) {
      this.moveCursorToStart();
      return;
    }

    // Line end: Ctrl+E
    if (key === 'e' && ctrl) {
      this.moveCursorToEnd();
      return;
    }

    // Delete forward: Ctrl+D
    if (key === 'd' && ctrl) {
      this.deleteForward();
      return;
    }

    // Backspace: Ctrl+H
    if (key === 'h' && ctrl) {
      this.deleteBackward();
      return;
    }

    switch (key) {
      case 'ArrowLeft':
        this.moveCursorLeft();
        return;
      case 'ArrowRight':
        this.moveCursorRight();
        return;
      case 'Home':
        this.moveCursorToStart();
        return;
      case 'End':
        this.moveCursorToEnd();
        return;
      case 'Backspace':
        this.deleteBackward();
        return;
      case 'Delete':
        this.deleteForward();
        return;
      default:
        break;
    }

    if (key.length === 1 && !ctrl && !alt && !meta) {
      this.insertText(key);
    }
  }

  private handlePaste(event: Event): void {
    if (this.isDisabled() || this.isReadonly()) {
      return;
    }

    const clipboardEvent = event as ClipboardEvent;
    const text = clipboardEvent.clipboardData?.getData('text/plain') ?? '';

    if (text.length > 0) {
      this.insertText(text);
    }
  }

  private handleFocus(): void {
    this.isFocused = true;
    this.cursorVisible = true;
    this.lastBlinkTimestamp = null;
    this.valueAtFocus = this.getValue();
    this.render();
  }

  private handleBlur(): void {
    const currentValue = this.getValue();

    this.isFocused = false;
    this.cursorVisible = false;
    this.lastBlinkTimestamp = null;
    this.render();

    if (currentValue !== this.valueAtFocus) {
      this.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }

  private insertText(text: string): void {
    const sanitized = text.replace(/[\n\r\t]/g, ' ');
    const newGraphemes = this.segmentGraphemes(sanitized);

    if (newGraphemes.length === 0) {
      return;
    }

    const maxLength = this.getMaxLength();

    if (maxLength > 0) {
      const available = maxLength - this.graphemes.length;

      if (available <= 0) {
        return;
      }

      if (newGraphemes.length > available) {
        newGraphemes.length = available;
      }
    }

    this.graphemes.splice(this.cursorPosition, 0, ...newGraphemes);
    this.cursorPosition += newGraphemes.length;
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(sanitized, 'insertText');
  }

  private deleteBackward(): void {
    if (this.cursorPosition === 0) {
      return;
    }

    this.graphemes.splice(this.cursorPosition - 1, 1);
    this.cursorPosition -= 1;
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteContentBackward');
  }

  private deleteForward(): void {
    if (this.cursorPosition >= this.graphemes.length) {
      return;
    }

    this.graphemes.splice(this.cursorPosition, 1);
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteContentForward');
  }

  private moveCursorLeft(): void {
    if (this.cursorPosition > 0) {
      this.cursorPosition -= 1;
      this.handleOverflow();
      this.resetBlink();
      this.render();
    }
  }

  private moveCursorRight(): void {
    if (this.cursorPosition < this.graphemes.length) {
      this.cursorPosition += 1;
      this.handleOverflow();
      this.resetBlink();
      this.render();
    }
  }

  private moveCursorToStart(): void {
    this.cursorPosition = 0;
    this.handleOverflow();
    this.resetBlink();
    this.render();
  }

  private moveCursorToEnd(): void {
    this.cursorPosition = this.graphemes.length;
    this.handleOverflow();
    this.resetBlink();
    this.render();
  }

  private moveCursorWordLeft(): void {
    if (this.cursorPosition === 0) {
      return;
    }

    let index = this.cursorPosition - 1;

    while (index > 0 && this.isWhitespace(this.graphemes[index]!)) {
      index -= 1;
    }

    while (index > 0 && !this.isWhitespace(this.graphemes[index - 1]!)) {
      index -= 1;
    }

    this.cursorPosition = index;
    this.handleOverflow();
    this.resetBlink();
    this.render();
  }

  private moveCursorWordRight(): void {
    if (this.cursorPosition >= this.graphemes.length) {
      return;
    }

    let index = this.cursorPosition;

    while (index < this.graphemes.length && !this.isWhitespace(this.graphemes[index]!)) {
      index += 1;
    }

    while (index < this.graphemes.length && this.isWhitespace(this.graphemes[index]!)) {
      index += 1;
    }

    this.cursorPosition = index;
    this.handleOverflow();
    this.resetBlink();
    this.render();
  }

  private deleteWordBackward(): void {
    if (this.cursorPosition === 0) {
      return;
    }

    const oldPos = this.cursorPosition;
    let index = this.cursorPosition - 1;

    while (index > 0 && this.isWhitespace(this.graphemes[index]!)) {
      index -= 1;
    }

    while (index > 0 && !this.isWhitespace(this.graphemes[index - 1]!)) {
      index -= 1;
    }

    this.graphemes.splice(index, oldPos - index);
    this.cursorPosition = index;
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteWordBackward');
  }

  private deleteWordForward(): void {
    if (this.cursorPosition >= this.graphemes.length) {
      return;
    }

    let index = this.cursorPosition;

    while (index < this.graphemes.length && !this.isWhitespace(this.graphemes[index]!)) {
      index += 1;
    }

    while (index < this.graphemes.length && this.isWhitespace(this.graphemes[index]!)) {
      index += 1;
    }

    this.graphemes.splice(this.cursorPosition, index - this.cursorPosition);
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteWordForward');
  }

  private deleteToLineStart(): void {
    if (this.cursorPosition === 0) {
      return;
    }

    this.graphemes.splice(0, this.cursorPosition);
    this.cursorPosition = 0;
    this.scrollOffset = 0;
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteSoftLineBackward');
  }

  private deleteToLineEnd(): void {
    if (this.cursorPosition >= this.graphemes.length) {
      return;
    }

    this.graphemes.splice(this.cursorPosition);
    this.syncAttributeFromValue();
    this.handleOverflow();
    this.resetBlink();
    this.render();
    this.dispatchInputEvent(null, 'deleteSoftLineForward');
  }

  private handleMouseDown(event: Event): void {
    if (this.isDisabled()) {
      return;
    }

    event.preventDefault();

    const doc = this.ownerDocument as import('../../dom').Document;
    doc.setActiveElement(this);
  }

  private blurSelf(): void {
    const doc = this.ownerDocument as import('../../dom').Document;
    doc.setActiveElement(null);
  }

  private isWhitespace(grapheme: string): boolean {
    return /^\s$/.test(grapheme);
  }

  private resetBlink(): void {
    this.cursorVisible = true;
    this.lastBlinkTimestamp = null;
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

      if (visibleWidth + graphemeWidth > width) {
        break;
      }

      visibleWidth += graphemeWidth;
      visibleEnd = index + 1;
    }

    if (this.cursorPosition > visibleEnd) {
      let widthFromCursor = 0;
      let newOffset = this.cursorPosition;

      for (let index = this.cursorPosition - 1; index >= 0; index -= 1) {
        const graphemeWidth = cellWidth(this.graphemes[index]!);

        if (widthFromCursor + graphemeWidth > width) {
          break;
        }

        widthFromCursor += graphemeWidth;
        newOffset = index;
      }

      this.scrollOffset = newOffset;
    }
  }

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

    if (this.graphemes.length === 0 && this.isFocused) {
      const cursorChar = this.cursorVisible ? UI_INPUT_CURSOR_CHAR : ' ';
      const padding = Math.max(0, width - 1);

      this.textContent = cursorChar + ' '.repeat(padding);
      return;
    }

    let output = '';
    let outputWidth = 0;
    const relativePos = this.cursorPosition - this.scrollOffset;

    for (let index = this.scrollOffset; index < this.graphemes.length; index += 1) {
      const grapheme = this.graphemes[index]!;
      const graphemeWidth = cellWidth(grapheme);

      if (outputWidth + graphemeWidth > width) {
        break;
      }

      const relativeIndex = index - this.scrollOffset;

      if (this.isFocused && this.cursorVisible && relativeIndex === relativePos) {
        output += UI_INPUT_CURSOR_CHAR;
        outputWidth += 1;

        if (graphemeWidth > 1) {
          outputWidth += graphemeWidth - 1;
          output += ' '.repeat(graphemeWidth - 1);
        }
      } else {
        output += grapheme;
        outputWidth += graphemeWidth;
      }
    }

    if (
      this.isFocused &&
      this.cursorVisible &&
      relativePos >= this.graphemes.length - this.scrollOffset
    ) {
      if (outputWidth < width) {
        output += UI_INPUT_CURSOR_CHAR;
        outputWidth += 1;
      }
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

    if (this.getValue() === attrValue) {
      return;
    }

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

      if (width + w > maxWidth) {
        break;
      }

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

    if (rawWidth == null) {
      return DEFAULT_UI_INPUT_WIDTH;
    }

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

    if (rawMax == null) {
      return 0;
    }

    const parsed = Number.parseInt(rawMax, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  private isReadonly(): boolean {
    return this.hasAttribute('readonly');
  }
}
