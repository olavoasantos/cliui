import styles from './styles.css?inline';

import {DEFAULT_UI_LOG_MAX_LINES, UI_LOG_OBSERVED_ATTRIBUTES, UI_LOG_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal scrollable log viewer custom element.
 *
 * Provides `append(text)` to add lines. New content automatically
 * scrolls to the bottom. Supports a `max-lines` attribute to cap
 * retained history.
 *
 * The element uses `overflow: scroll` so it must have an explicit
 * `height` set (via CSS or inline style) to create a scrollable
 * viewport.
 *
 * Register with `window.customElements.define(UiLog.tagName, UiLog)`
 * before creating `<ui-log>` elements in a window.
 */
export class UiLog extends HTMLElement {
  static override readonly observedAttributes = UI_LOG_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_LOG_TAG_NAME;

  /**
   * Appends a text line to the log.
   *
   * Each call creates a new block-level child element. If `max-lines`
   * is set and exceeded, the oldest lines are removed. Automatically
   * scrolls to the bottom after appending.
   */
  append(text: string): void {
    const doc = this.ownerDocument!;
    const line = doc.createElement('div');
    line.textContent = text;
    this.appendChild(line);

    this.trimLines();
    this.scrollToBottom();
  }

  /** Clears all log content and resets scroll position. */
  clear(): void {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    (this as unknown as {scrollTop: number}).scrollTop = 0;
  }

  /** Returns the current number of lines. */
  getLineCount(): number {
    return this.childNodes.length;
  }

  /* ── Private ────────────────────────────────────────────── */

  private scrollToBottom(): void {
    /* Set scrollTop to a very large value; the layout engine will
       clamp it to the maximum scroll offset on the next frame. */
    (this as unknown as {scrollTop: number}).scrollTop = 999999;
  }

  private trimLines(): void {
    const maxLines = this.getMaxLines();

    if (maxLines <= 0) return;

    while (this.childNodes.length > maxLines) {
      this.removeChild(this.childNodes[0]!);
    }
  }

  private getMaxLines(): number {
    const raw = this.getAttribute('max-lines');

    if (raw == null) return DEFAULT_UI_LOG_MAX_LINES;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_UI_LOG_MAX_LINES;
  }
}
