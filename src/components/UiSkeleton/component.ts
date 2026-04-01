import styles from './styles.css?inline';

import {
  DEFAULT_UI_SKELETON_HEIGHT,
  DEFAULT_UI_SKELETON_WIDTH,
  UI_SKELETON_BASE_CHAR,
  UI_SKELETON_OBSERVED_ATTRIBUTES,
  UI_SKELETON_SHIMMER_CHAR,
  UI_SKELETON_SHIMMER_SPEED,
  UI_SKELETON_SHIMMER_WIDTH,
  UI_SKELETON_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';

/**
 * Built-in terminal skeleton loading placeholder custom element.
 *
 * Renders a shimmer animation — a bright band sweeping left to
 * right across dim block characters, similar to web skeleton
 * loading indicators.
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

  /** Current shimmer position (fractional column). */
  private shimmerPos = -UI_SKELETON_SHIMMER_WIDTH;

  /** Timestamp of the previous frame. */
  private lastTimestamp: number | null = null;

  connectedCallback(): void {
    this.renderFrame();
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    this.renderFrame();
  }

  /**
   * Advances the shimmer sweep.
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

    const w = this.getDimension('width', DEFAULT_UI_SKELETON_WIDTH);

    this.shimmerPos += UI_SKELETON_SHIMMER_SPEED * dt;

    /* Wrap around when the shimmer has fully passed */
    if (this.shimmerPos > w) {
      this.shimmerPos = -UI_SKELETON_SHIMMER_WIDTH;
    }

    this.renderFrame();
  }

  /* ── Private ────────────────────────────────────────────── */

  private renderFrame(): void {
    const w = this.getDimension('width', DEFAULT_UI_SKELETON_WIDTH);
    const h = this.getDimension('height', DEFAULT_UI_SKELETON_HEIGHT);
    const shimmerStart = Math.floor(this.shimmerPos);
    const shimmerEnd = shimmerStart + UI_SKELETON_SHIMMER_WIDTH;

    let line = '';

    for (let x = 0; x < w; x++) {
      line +=
        x >= shimmerStart && x < shimmerEnd ? UI_SKELETON_SHIMMER_CHAR : UI_SKELETON_BASE_CHAR;
    }

    this.textContent = Array.from({length: h}, () => line).join('\n');
  }

  private getDimension(name: string, fallback: number): number {
    const raw = this.getAttribute(name);

    if (raw == null) return fallback;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
