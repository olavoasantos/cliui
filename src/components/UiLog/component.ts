import styles from './styles.css?inline';

import {DEFAULT_UI_LOG_MAX_LINES, UI_LOG_OBSERVED_ATTRIBUTES, UI_LOG_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal scrollable log viewer custom element.
 *
 * Provides `append(text)` to add lines. New content triggers a
 * scroll-to-bottom unless the user has scrolled up. Supports a
 * `max-lines` attribute to cap retained history.
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
   * is set and exceeded, the oldest lines are removed.
   */
  append(text: string): void {
    const doc = this.ownerDocument!;
    const line = doc.createElement('div');
    line.textContent = text;
    this.appendChild(line);

    this.trimLines();
  }

  /** Clears all log content. */
  clear(): void {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }
  }

  /** Returns the current number of lines. */
  getLineCount(): number {
    return this.childNodes.length;
  }

  /* ── Private ────────────────────────────────────────────── */

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
