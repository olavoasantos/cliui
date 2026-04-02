import styles from './styles.css?inline';

import {
  DEFAULT_UI_SPINNER_VARIANT_NAME,
  UI_SPINNER_LABEL_SEPARATOR,
  UI_SPINNER_OBSERVED_ATTRIBUTES,
  UI_SPINNER_TAG_NAME,
  UI_SPINNER_VARIANTS,
} from './constants';
import {HTMLElement} from '@cliui/dom';

import type {TerminalFrameAware} from '@cliui/terminal';
import type {UiSpinnerVariantName} from './types';

/**
 * Built-in animated terminal spinner custom element.
 *
 * Register with `window.customElements.define(UiSpinner.tagName, UiSpinner)`
 * before creating `<ui-spinner>` elements in a window.
 */
export class UiSpinner extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_SPINNER_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_SPINNER_TAG_NAME;

  private currentFrameIndex = 0;
  private lastFrameTimestamp: number | null = null;

  connectedCallback(): void {
    this.renderCurrentFrame();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'variant') {
      this.currentFrameIndex = 0;
      this.lastFrameTimestamp = null;
    }

    if (name === 'paused') {
      this.lastFrameTimestamp = null;
    }

    this.renderCurrentFrame();
  }

  /**
   * Advances the spinner in response to a terminal frame tick.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (this.isPaused()) {
      return;
    }

    if (this.lastFrameTimestamp == null) {
      this.lastFrameTimestamp = timestamp;
      return;
    }

    const interval = this.getInterval();
    const elapsed = timestamp - this.lastFrameTimestamp;

    if (elapsed < interval) {
      return;
    }

    const frames = this.getFrames();
    const steps = Math.floor(elapsed / interval);

    this.currentFrameIndex = (this.currentFrameIndex + steps) % frames.length;
    this.lastFrameTimestamp += steps * interval;
    this.renderCurrentFrame();
  }

  private getFrames(): string[] {
    return UI_SPINNER_VARIANTS[this.getVariantName()].frames;
  }

  private getInterval(): number {
    const rawInterval = this.getAttribute('interval');

    if (rawInterval == null) {
      return UI_SPINNER_VARIANTS[this.getVariantName()].interval;
    }

    const parsedInterval = Number.parseInt(rawInterval, 10);

    if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
      return UI_SPINNER_VARIANTS[this.getVariantName()].interval;
    }

    return parsedInterval;
  }

  private getVariantName(): UiSpinnerVariantName {
    const rawVariant = this.getAttribute('variant');

    if (rawVariant == null || !(rawVariant in UI_SPINNER_VARIANTS)) {
      return DEFAULT_UI_SPINNER_VARIANT_NAME;
    }

    return rawVariant as UiSpinnerVariantName;
  }

  private getLabel(): string {
    return this.getAttribute('label') ?? '';
  }

  private isPaused(): boolean {
    return this.hasAttribute('paused');
  }

  private renderCurrentFrame(): void {
    const frame = this.getFrames()[this.currentFrameIndex] ?? '';
    const label = this.getLabel();

    this.textContent = label.length > 0 ? `${frame}${UI_SPINNER_LABEL_SEPARATOR}${label}` : frame;
  }
}
