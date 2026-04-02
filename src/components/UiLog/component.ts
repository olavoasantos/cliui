import styles from './styles.css?inline';

import {DEFAULT_UI_LOG_MAX_LINES, UI_LOG_OBSERVED_ATTRIBUTES, UI_LOG_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal log viewer custom element.
 *
 * Provides `append(text)` to add lines. The component keeps a
 * configurable visible height (set via the `height` attribute)
 * and uses native `overflow: scroll` for scrollback. New lines
 * auto-scroll to the bottom.
 *
 * Set `max-lines` to cap total retained history (0 = unlimited).
 * Mouse wheel scrolling allows reviewing older entries.
 *
 * Register with `window.customElements.define(UiLog.tagName, UiLog)`
 * before creating `<ui-log>` elements in a window.
 */
export class UiLog extends HTMLElement {
  static override readonly observedAttributes = UI_LOG_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_LOG_TAG_NAME;

  /** Full log history (may exceed visible window). */
  private lines: string[] = [];

  /**
   * Appends a text line to the log.
   *
   * Trims history to `max-lines` if set, then renders the new
   * line and scrolls to the bottom.
   */
  append(text: string): void {
    this.lines.push(text);

    const trimmed = this.trimHistory();

    if (trimmed) {
      this.renderAll();
    } else {
      this.appendLineElement(text);
    }

    this.scrollToBottom();
  }

  /** Clears all log content. */
  clear(): void {
    this.lines = [];

    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }
  }

  /** Returns the current number of retained lines. */
  getLineCount(): number {
    return this.lines.length;
  }

  /* ── Private ────────────────────────────────────────────── */

  private appendLineElement(text: string): void {
    const doc = this.ownerDocument!;
    const line = doc.createElement('div');

    line.textContent = text;
    this.appendChild(line);
  }

  private renderAll(): void {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    for (const text of this.lines) {
      this.appendLineElement(text);
    }
  }

  private scrollToBottom(): void {
    const selfWithScroll = this as HTMLElement & {scrollTop?: number};

    // Set to a large value; the layout engine clamps to maxScrollOffset
    selfWithScroll.scrollTop = this.lines.length;
  }

  /**
   * Trims history to `max-lines`. Returns true if lines were removed.
   */
  private trimHistory(): boolean {
    const maxLines = this.getMaxLines();

    if (maxLines <= 0 || this.lines.length <= maxLines) return false;

    while (this.lines.length > maxLines) {
      this.lines.shift();
    }

    return true;
  }

  private getMaxLines(): number {
    const raw = this.getAttribute('max-lines');

    if (raw == null) return DEFAULT_UI_LOG_MAX_LINES;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_UI_LOG_MAX_LINES;
  }
}
