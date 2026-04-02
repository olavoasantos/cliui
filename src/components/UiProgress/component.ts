import styles from './styles.css?inline';

import {
  DEFAULT_UI_PROGRESS_MAX,
  DEFAULT_UI_PROGRESS_VARIANT_NAME,
  DEFAULT_UI_PROGRESS_WIDTH,
  MIN_UI_PROGRESS_WIDTH,
  UI_PROGRESS_EQUILIBRIUM_DISTANCE,
  UI_PROGRESS_EQUILIBRIUM_VELOCITY,
  UI_PROGRESS_OBSERVED_ATTRIBUTES,
  UI_PROGRESS_PART_SEPARATOR,
  UI_PROGRESS_SPRING_DAMPING,
  UI_PROGRESS_SPRING_EPSILON,
  UI_PROGRESS_SPRING_FREQUENCY,
  UI_PROGRESS_STATIC_SPRING,
  UI_PROGRESS_TAG_NAME,
  UI_PROGRESS_VARIANTS,
} from './constants';
import {HTMLElement} from '@cliui/dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';
import type {UiProgressSpringCoefficients, UiProgressVariantName} from './types';

/**
 * Built-in animated terminal progress bar custom element.
 *
 * Register with `window.customElements.define(UiProgress.tagName, UiProgress)`
 * before creating `<ui-progress>` elements in a window.
 */
export class UiProgress extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_PROGRESS_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_PROGRESS_TAG_NAME;

  private displayedProgress = 0;
  private targetProgress = 0;
  private velocity = 0;
  private lastFrameTimestamp: number | null = null;
  private hasInitializedProgress = false;

  connectedCallback(): void {
    this.syncProgressFromAttributes(false);
    this.renderProgress();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'animated' && newValue == null) {
      this.lastFrameTimestamp = null;
    }

    if (name === 'value' || name === 'max' || name === 'animated') {
      this.syncProgressFromAttributes(name === 'animated');
    }

    this.renderProgress();
  }

  /**
   * Advances the rendered progress in response to a terminal frame tick.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void {
    if (!this.isAnimated()) {
      return;
    }

    if (this.lastFrameTimestamp == null) {
      this.lastFrameTimestamp = timestamp;
      return;
    }

    if (!this.isAnimating()) {
      this.displayedProgress = this.targetProgress;
      this.velocity = 0;
      this.lastFrameTimestamp = timestamp;
      this.renderProgress();
      return;
    }

    const deltaTime = Math.max(0, timestamp - this.lastFrameTimestamp) / 1000;

    if (deltaTime <= 0) {
      return;
    }

    const coefficients = this.createSpringCoefficients(deltaTime);
    const relativePosition = this.displayedProgress - this.targetProgress;
    const nextProgress =
      relativePosition * coefficients.posPosCoefficient +
      this.velocity * coefficients.posVelCoefficient +
      this.targetProgress;
    const nextVelocity =
      relativePosition * coefficients.velPosCoefficient +
      this.velocity * coefficients.velVelCoefficient;

    this.displayedProgress = this.clampProgress(nextProgress);
    this.velocity = nextVelocity;
    this.lastFrameTimestamp = timestamp;

    if (!this.isAnimating()) {
      this.displayedProgress = this.targetProgress;
      this.velocity = 0;
    }

    this.renderProgress();
  }

  private buildBar(): string {
    const width = this.getWidth();
    const filledWidth = Math.max(0, Math.min(width, Math.round(width * this.displayedProgress)));
    const fillChar = this.getFillChar();
    const emptyChar = this.getEmptyChar();

    return fillChar.repeat(filledWidth) + emptyChar.repeat(width - filledWidth);
  }

  private clampProgress(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(1, value));
  }

  private createSpringCoefficients(deltaTime: number): UiProgressSpringCoefficients {
    const angularFrequency = Math.max(0, UI_PROGRESS_SPRING_FREQUENCY);
    const dampingRatio = Math.max(0, UI_PROGRESS_SPRING_DAMPING);

    if (angularFrequency < UI_PROGRESS_SPRING_EPSILON) {
      return UI_PROGRESS_STATIC_SPRING;
    }

    if (dampingRatio > 1 + UI_PROGRESS_SPRING_EPSILON) {
      const za = -angularFrequency * dampingRatio;
      const zb = angularFrequency * Math.sqrt(dampingRatio * dampingRatio - 1);
      const z1 = za - zb;
      const z2 = za + zb;
      const e1 = Math.exp(z1 * deltaTime);
      const e2 = Math.exp(z2 * deltaTime);
      const inverseTwoZb = 1 / (2 * zb);
      const e1OverTwoZb = e1 * inverseTwoZb;
      const e2OverTwoZb = e2 * inverseTwoZb;
      const z1e1OverTwoZb = z1 * e1OverTwoZb;
      const z2e2OverTwoZb = z2 * e2OverTwoZb;

      return {
        posPosCoefficient: e1OverTwoZb * z2 - z2e2OverTwoZb + e2,
        posVelCoefficient: -e1OverTwoZb + e2OverTwoZb,
        velPosCoefficient: (z1e1OverTwoZb - z2e2OverTwoZb + e2) * z2,
        velVelCoefficient: -z1e1OverTwoZb + z2e2OverTwoZb,
      };
    }

    if (dampingRatio < 1 - UI_PROGRESS_SPRING_EPSILON) {
      const omegaZeta = angularFrequency * dampingRatio;
      const alpha = angularFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
      const exponentialTerm = Math.exp(-omegaZeta * deltaTime);
      const cosTerm = Math.cos(alpha * deltaTime);
      const sinTerm = Math.sin(alpha * deltaTime);
      const inverseAlpha = 1 / alpha;
      const exponentialSin = exponentialTerm * sinTerm;
      const exponentialCos = exponentialTerm * cosTerm;
      const exponentialOmegaZetaSinOverAlpha = exponentialTerm * omegaZeta * sinTerm * inverseAlpha;

      return {
        posPosCoefficient: exponentialCos + exponentialOmegaZetaSinOverAlpha,
        posVelCoefficient: exponentialSin * inverseAlpha,
        velPosCoefficient: -exponentialSin * alpha - omegaZeta * exponentialOmegaZetaSinOverAlpha,
        velVelCoefficient: exponentialCos - exponentialOmegaZetaSinOverAlpha,
      };
    }

    const exponentialTerm = Math.exp(-angularFrequency * deltaTime);
    const timeExp = deltaTime * exponentialTerm;
    const timeExpFrequency = timeExp * angularFrequency;

    return {
      posPosCoefficient: timeExpFrequency + exponentialTerm,
      posVelCoefficient: timeExp,
      velPosCoefficient: -angularFrequency * timeExpFrequency,
      velVelCoefficient: -timeExpFrequency + exponentialTerm,
    };
  }

  private getDisplayParts(): string[] {
    const parts = new Array<string>();
    const label = this.getLabel();

    if (label.length > 0) {
      parts.push(label);
    }

    parts.push(this.buildBar());

    if (this.shouldShowValue()) {
      parts.push(`${Math.round(this.displayedProgress * 100)}%`);
    }

    return parts;
  }

  private getEmptyChar(): string {
    return this.getAttribute('empty-char') ?? UI_PROGRESS_VARIANTS[this.getVariantName()].emptyChar;
  }

  private getFillChar(): string {
    return this.getAttribute('fill-char') ?? UI_PROGRESS_VARIANTS[this.getVariantName()].fillChar;
  }

  private getLabel(): string {
    return this.getAttribute('label') ?? '';
  }

  private getMax(): number {
    const rawMax = this.getAttribute('max');
    const parsedMax = rawMax == null ? DEFAULT_UI_PROGRESS_MAX : Number(rawMax);

    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return DEFAULT_UI_PROGRESS_MAX;
    }

    return parsedMax;
  }

  private getTargetProgress(): number {
    const rawValue = this.getAttribute('value');
    const parsedValue = rawValue == null ? 0 : Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return 0;
    }

    return this.clampProgress(parsedValue / this.getMax());
  }

  private getVariantName(): UiProgressVariantName {
    const rawVariant = this.getAttribute('variant');

    if (rawVariant == null || !(rawVariant in UI_PROGRESS_VARIANTS)) {
      return DEFAULT_UI_PROGRESS_VARIANT_NAME;
    }

    return rawVariant as UiProgressVariantName;
  }

  private getWidth(): number {
    const rawWidth = this.getAttribute('width');

    if (rawWidth == null) {
      return DEFAULT_UI_PROGRESS_WIDTH;
    }

    const parsedWidth = Number.parseInt(rawWidth, 10);

    if (!Number.isFinite(parsedWidth) || parsedWidth < MIN_UI_PROGRESS_WIDTH) {
      return DEFAULT_UI_PROGRESS_WIDTH;
    }

    return parsedWidth;
  }

  private isAnimated(): boolean {
    return this.hasAttribute('animated');
  }

  private isAnimating(): boolean {
    const distance = Math.abs(this.displayedProgress - this.targetProgress);
    return !(
      distance < UI_PROGRESS_EQUILIBRIUM_DISTANCE &&
      Math.abs(this.velocity) < UI_PROGRESS_EQUILIBRIUM_VELOCITY
    );
  }

  private renderProgress(): void {
    this.textContent = this.getDisplayParts().join(UI_PROGRESS_PART_SEPARATOR);
  }

  private shouldShowValue(): boolean {
    return this.hasAttribute('show-value');
  }

  private syncProgressFromAttributes(keepDisplayedWhenAnimated: boolean): void {
    this.targetProgress = this.getTargetProgress();

    if (!this.hasInitializedProgress) {
      this.displayedProgress = this.targetProgress;
      this.velocity = 0;
      this.hasInitializedProgress = true;
      return;
    }

    if (this.isAnimated() && keepDisplayedWhenAnimated) {
      return;
    }

    if (this.isAnimated()) {
      return;
    }

    this.displayedProgress = this.targetProgress;
    this.velocity = 0;
    this.lastFrameTimestamp = null;
  }
}
