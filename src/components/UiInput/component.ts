import styles from './styles.css?inline';

import {
  DEFAULT_UI_INPUT_WIDTH,
  MIN_UI_INPUT_WIDTH,
  UI_INPUT_OBSERVED_ATTRIBUTES,
  UI_INPUT_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';
import {GRAPHEME_SEGMENTER} from '../../layout/constants/cellWidth';
import {graphemeWidth} from '../../layout/utilities/graphemeWidth';
import {EDITABLE} from '../../terminal/constants/editable';

import type {EditableConfiguration} from '../../terminal/types/EditableConfiguration';

/**
 * Built-in single-line text input custom element.
 *
 * Declares an `[EDITABLE]` configuration so the terminal editing system
 * manages cursor, caret, keyboard handling, paste, scrolling, and
 * content rendering automatically.
 *
 * Register with `window.customElements.define(UiInput.tagName, UiInput)`
 * before creating `<ui-input>` elements in a window.
 */
export class UiInput extends HTMLElement {
  static override readonly observedAttributes = UI_INPUT_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_INPUT_TAG_NAME;

  /** Declarative editing configuration for the terminal system. */
  [EDITABLE]: EditableConfiguration = {
    intrinsicWidth: () => this.getWidth(),
    intrinsicHeight: () => 1,
    wordWrap: false,
    multiLine: false,
    valueAttribute: 'value',
    maxLength: () => this.getMaxLength(),
    placeholder: () => this.getPlaceholder(),
  };

  connectedCallback(): void {
    this.renderInitial();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'disabled') {
      if (newValue != null) {
        this.removeAttribute('tabindex');
      } else {
        this.ensureTabIndex();
      }
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  /**
   * Renders initial content (placeholder or spaces) before the element
   * receives focus and the editing system takes over rendering.
   */
  private renderInitial(): void {
    if (!this.hasAttribute('disabled')) {
      this.ensureTabIndex();
    }

    const width = this.getWidth();
    const value = this.getAttribute('value') ?? '';

    if (value.length > 0) {
      this.textContent = this.truncateToWidth(value, width);
      return;
    }

    const placeholder = this.getPlaceholder();

    if (placeholder.length > 0) {
      this.textContent = this.truncateToWidth(placeholder, width);
      return;
    }

    this.textContent = ' '.repeat(width);
  }

  private truncateToWidth(text: string, maxWidth: number): string {
    let result = '';
    let width = 0;

    for (const {segment} of GRAPHEME_SEGMENTER.segment(text)) {
      const w = graphemeWidth(segment);
      if (width + w > maxWidth) break;
      result += segment;
      width += w;
    }

    if (width < maxWidth) {
      result += ' '.repeat(maxWidth - width);
    }

    return result;
  }

  private getWidth(): number {
    const rawWidth = this.getAttribute('width');
    if (rawWidth == null) return DEFAULT_UI_INPUT_WIDTH;
    const parsed = Number.parseInt(rawWidth, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_UI_INPUT_WIDTH) return DEFAULT_UI_INPUT_WIDTH;
    return parsed;
  }

  private getPlaceholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  private getMaxLength(): number {
    const rawMax = this.getAttribute('maxlength');
    if (rawMax == null) return 0;
    const parsed = Number.parseInt(rawMax, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
