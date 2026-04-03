import styles from './styles.css?inline';

import {
  DEFAULT_METER_WIDTH,
  METER_EMPTY_CHAR,
  METER_FILL_CHAR,
  METER_OBSERVED_ATTRIBUTES,
  METER_TAG_NAME,
} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal meter gauge custom element.
 *
 * Displays a scalar value within a known range as a horizontal bar.
 * Supports `low`, `high`, and `optimum` threshold attributes for
 * color-coded regions (green for optimum, yellow for suboptimal,
 * red for critical).
 *
 * Register with `window.customElements.define(Meter.tagName, Meter)`
 * before creating `<meter>` elements in a window.
 */
export class Meter extends HTMLElement {
  static override readonly observedAttributes = METER_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = METER_TAG_NAME;

  connectedCallback(): void {
    this.renderBar();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    this.renderBar();
  }

  /** Returns the current value, clamped to [min, max]. */
  getValue(): number {
    const min = this.getMin();
    const max = this.getMax();
    const raw = this.parseAttr('value', 0);

    return Math.max(min, Math.min(max, raw));
  }

  /** Returns the minimum bound. */
  getMin(): number {
    return this.parseAttr('min', 0);
  }

  /** Returns the maximum bound. */
  getMax(): number {
    return this.parseAttr('max', 1);
  }

  /* ── Private ────────────────────────────────────────────── */

  private renderBar(): void {
    const min = this.getMin();
    const max = this.getMax();
    const value = this.getValue();
    const range = max - min;
    const ratio = range > 0 ? (value - min) / range : 0;
    const width = this.parseAttr('width', DEFAULT_METER_WIDTH);
    const filled = Math.round(ratio * width);

    this.textContent = METER_FILL_CHAR.repeat(filled) + METER_EMPTY_CHAR.repeat(width - filled);
  }

  private parseAttr(name: string, fallback: number): number {
    const raw = this.getAttribute(name);

    if (raw == null) return fallback;

    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
