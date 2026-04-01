import styles from './styles.css?inline';

import {DEFAULT_UI_LOG_MAX_LINES, UI_LOG_OBSERVED_ATTRIBUTES, UI_LOG_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal log viewer custom element.
 *
 * Provides `append(text)` to add lines. The component keeps a
 * configurable number of visible lines (set via the `height`
 * attribute) and internally trims older entries so only the
 * tail is displayed — no scroll container needed.
 *
 * Set `max-lines` to cap total retained history (0 = unlimited).
 * The visible window is controlled by the `height` attribute
 * (defaults to all lines).
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
   * Trims history to `max-lines` if set, then re-renders the
   * visible tail.
   */
  append(text: string): void {
    this.lines.push(text);
    this.trimHistory();
    this.renderTail();
  }

  /** Clears all log content. */
  clear(): void {
    this.lines = [];
    this.renderTail();
  }

  /** Returns the current number of retained lines. */
  getLineCount(): number {
    return this.lines.length;
  }

  /* ── Private ────────────────────────────────────────────── */

  private renderTail(): void {
    /* Remove all current children */
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    const doc = this.ownerDocument!;
    const visibleCount = this.getVisibleCount();
    const start = visibleCount > 0 ? Math.max(0, this.lines.length - visibleCount) : 0;

    for (let i = start; i < this.lines.length; i++) {
      const line = doc.createElement('div');
      line.textContent = this.lines[i]!;
      this.appendChild(line);
    }
  }

  private trimHistory(): void {
    const maxLines = this.getMaxLines();

    if (maxLines <= 0) return;

    while (this.lines.length > maxLines) {
      this.lines.shift();
    }
  }

  private getVisibleCount(): number {
    const raw = this.getAttribute('height');

    if (raw == null) return 0; /* 0 = show all */

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private getMaxLines(): number {
    const raw = this.getAttribute('max-lines');

    if (raw == null) return DEFAULT_UI_LOG_MAX_LINES;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_UI_LOG_MAX_LINES;
  }
}
