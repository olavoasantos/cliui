import styles from './styles.css?inline';

import {
  DEFAULT_UI_SKELETON_HEIGHT,
  DEFAULT_UI_SKELETON_WIDTH,
  UI_SKELETON_FRAMES,
  UI_SKELETON_OBSERVED_ATTRIBUTES,
  UI_SKELETON_PULSE_INTERVAL,
  UI_SKELETON_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';

/**
 * Built-in terminal skeleton loading placeholder custom element.
 *
 * Renders dim pulsing block characters in the shape specified by
 * `width` and `height` attributes, indicating content is loading.
 * Implements `TerminalFrameAware` for the pulse animation.
 *
 * Register with `window.customElements.define(UiSkeleton.tagName, UiSkeleton)`
 * before creating `<ui-skeleton>` elements in a window.
 */
export class UiSkeleton extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_SKELETON_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_SKELETON_TAG_NAME;

  /** Current animation frame index. */
  private frameIndex = 0;

  /** Timestamp of the last frame switch. */
  private lastSwitch: number | null = null;

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
   * Advances the pulse animation.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (this.lastSwitch == null) {
      this.lastSwitch = timestamp;
      return;
    }

    if (timestamp - this.lastSwitch >= UI_SKELETON_PULSE_INTERVAL) {
      this.frameIndex = (this.frameIndex + 1) % UI_SKELETON_FRAMES.length;
      this.lastSwitch = timestamp;
      this.renderFrame();
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  private renderFrame(): void {
    const w = this.getDimension('width', DEFAULT_UI_SKELETON_WIDTH);
    const h = this.getDimension('height', DEFAULT_UI_SKELETON_HEIGHT);
    const char = UI_SKELETON_FRAMES[this.frameIndex]!;
    const line = char.repeat(w);

    this.textContent = Array.from({length: h}, () => line).join('\n');
  }

  private getDimension(name: string, fallback: number): number {
    const raw = this.getAttribute(name);

    if (raw == null) return fallback;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
