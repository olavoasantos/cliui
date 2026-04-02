import styles from './styles.css?inline';

import {
  DEFAULT_UI_SKELETON_HEIGHT,
  DEFAULT_UI_SKELETON_WIDTH,
  UI_SKELETON_BASE_COLOR,
  UI_SKELETON_OBSERVED_ATTRIBUTES,
  UI_SKELETON_SHIMMER_COLOR,
  UI_SKELETON_SHIMMER_SPEED,
  UI_SKELETON_TAG_NAME,
} from './constants';
import {HTMLElement} from '@cliui/dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';

/**
 * Built-in terminal skeleton loading placeholder custom element.
 *
 * Renders a shimmer animation using a moving `linear-gradient`
 * background — a bright band sweeps across the placeholder,
 * similar to web skeleton loading indicators.
 *
 * Set `width` and `height` attributes to control the placeholder
 * dimensions. The element fills its area with space characters so
 * the gradient background is visible.
 *
 * Implements `TerminalFrameAware` for smooth animation driven
 * by the terminal render loop.
 *
 * Register with `window.customElements.define(UiSkeleton.tagName, UiSkeleton)`
 * before creating `<ui-skeleton>` elements in a window.
 */
export class UiSkeleton extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_SKELETON_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_SKELETON_TAG_NAME;

  /** Current gradient angle in degrees. */
  private angle = 0;

  /** Timestamp of the previous frame. */
  private lastTimestamp: number | null = null;

  connectedCallback(): void {
    this.renderContent();
    this.syncGradient();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    this.renderContent();
  }

  /**
   * Advances the shimmer gradient angle.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (this.lastTimestamp == null) {
      this.lastTimestamp = timestamp;
      return;
    }

    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.angle = (this.angle + UI_SKELETON_SHIMMER_SPEED * dt) % 360;
    this.syncGradient();
  }

  /* ── Private ────────────────────────────────────────────── */

  /** Fills the element with spaces so the background gradient is visible. */
  private renderContent(): void {
    const w = this.getDimension('width', DEFAULT_UI_SKELETON_WIDTH);
    const h = this.getDimension('height', DEFAULT_UI_SKELETON_HEIGHT);
    const line = ' '.repeat(w);

    this.textContent = Array.from({length: h}, () => line).join('\n');
    this.style.width = String(w);
    this.style.height = String(h);
  }

  /** Updates the background-color gradient angle. */
  private syncGradient(): void {
    const deg = Math.round(this.angle);

    this.style.backgroundColor = `linear-gradient(${deg}deg, ${UI_SKELETON_BASE_COLOR}, ${UI_SKELETON_SHIMMER_COLOR}, ${UI_SKELETON_BASE_COLOR})`;
  }

  private getDimension(name: string, fallback: number): number {
    const raw = this.getAttribute(name);

    if (raw == null) return fallback;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
