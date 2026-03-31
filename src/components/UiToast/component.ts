import styles from './styles.css?inline';

import {
  DEFAULT_UI_TOAST_DURATION,
  DEFAULT_UI_TOAST_VARIANT,
  UI_TOAST_OBSERVED_ATTRIBUTES,
  UI_TOAST_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';
import type {UiToastVariant} from './types';

/**
 * Built-in terminal toast notification custom element.
 *
 * Displays a temporary message that auto-removes itself from the DOM
 * after `duration` milliseconds. Supports `info`, `success`, `warning`,
 * and `error` variants via the `variant` attribute.
 *
 * Implements `TerminalFrameAware` so the terminal render loop drives
 * the countdown timer. Multiple toasts stack naturally as block-level
 * absolutely positioned elements.
 *
 * Register with `window.customElements.define(UiToast.tagName, UiToast)`
 * before creating `<ui-toast>` elements in a window.
 */
export class UiToast extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_TOAST_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TOAST_TAG_NAME;

  /** Timestamp (ms) when the toast was first ticked. */
  private startTimestamp: number | null = null;

  /** Returns the current variant, falling back to the default. */
  getVariant(): UiToastVariant {
    const raw = this.getAttribute('variant');

    if (raw === 'info' || raw === 'success' || raw === 'warning' || raw === 'error') {
      return raw;
    }

    return DEFAULT_UI_TOAST_VARIANT;
  }

  /** Returns the configured duration in milliseconds. */
  getDuration(): number {
    const raw = this.getAttribute('duration');

    if (raw == null) return DEFAULT_UI_TOAST_DURATION;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_UI_TOAST_DURATION;
  }

  /**
   * Advances the toast countdown. Removes the element from the DOM
   * when the duration has elapsed.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (this.startTimestamp == null) {
      this.startTimestamp = timestamp;
      return;
    }

    const elapsed = timestamp - this.startTimestamp;

    if (elapsed >= this.getDuration()) {
      this.detach();
    }
  }

  /** Removes the toast from its parent. */
  private detach(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this as unknown as import('../../dom').Node);
    }
  }
}
