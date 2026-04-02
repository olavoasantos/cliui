import styles from './styles.css?inline';

import {
  DEFAULT_UI_TOAST_DURATION,
  DEFAULT_UI_TOAST_TONE,
  UI_TOAST_OBSERVED_ATTRIBUTES,
  UI_TOAST_TAG_NAME,
} from './constants';
import {HTMLElement} from '@cliui/dom';
import type {Node} from '@cliui/dom';

import type {TerminalFrameAware} from '@cliui/terminal';
import type {UiToastTone} from './types';

/**
 * Built-in terminal toast notification custom element.
 *
 * Displays a temporary message that auto-removes itself from the DOM
 * after `duration` milliseconds. Supports `info`, `success`, `warning`,
 * and `error` tones via the `tone` attribute. An optional `title`
 * attribute renders a bold prefix before the message content.
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

  /** Returns the current tone, falling back to the default. */
  getTone(): UiToastTone {
    const raw = this.getAttribute('tone');

    if (raw === 'info' || raw === 'success' || raw === 'warning' || raw === 'error') {
      return raw;
    }

    return DEFAULT_UI_TOAST_TONE;
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
      this.parentNode.removeChild(this as unknown as Node);
    }
  }
}
