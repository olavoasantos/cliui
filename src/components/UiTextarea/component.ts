import styles from './styles.css?inline';

import {
  DEFAULT_UI_TEXTAREA_COLS,
  DEFAULT_UI_TEXTAREA_ROWS,
  MIN_UI_TEXTAREA_COLS,
  MIN_UI_TEXTAREA_ROWS,
  UI_TEXTAREA_OBSERVED_ATTRIBUTES,
  UI_TEXTAREA_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';
import {EDITABLE} from '../../terminal/constants/editable';

import type {EditableConfiguration} from '../../terminal/types/EditableConfiguration';

/**
 * Built-in multi-line text editing custom element.
 *
 * Declares an `[EDITABLE]` configuration with `multiLine: true` and
 * `wordWrap: true` so the terminal editing system manages cursor,
 * caret, keyboard handling (including ArrowUp/Down and Enter), paste,
 * vertical scrolling, and content rendering automatically.
 *
 * The `rows` and `cols` attributes control intrinsic sizing. CSS
 * `width` and `height` override the intrinsic dimensions when set.
 *
 * Register with `window.customElements.define(UiTextarea.tagName, UiTextarea)`
 * before creating `<ui-textarea>` elements in a window.
 */
export class UiTextarea extends HTMLElement {
  static override readonly observedAttributes = UI_TEXTAREA_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TEXTAREA_TAG_NAME;

  /** Declarative editing configuration for the terminal system. */
  [EDITABLE]: EditableConfiguration = {
    intrinsicWidth: () => this.getCols(),
    intrinsicHeight: () => this.getRows(),
    wordWrap: true,
    multiLine: true,
    valueAttribute: 'value',
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
   * Renders initial content before the element receives focus and the
   * editing system takes over rendering.
   */
  private renderInitial(): void {
    if (!this.hasAttribute('disabled')) {
      this.ensureTabIndex();
    }

    const cols = this.getCols();
    const rows = this.getRows();
    const value = this.getAttribute('value') ?? '';

    if (value.length > 0) {
      this.textContent = this.padToViewport(value, cols, rows);
      return;
    }

    const placeholder = this.getPlaceholder();

    if (placeholder.length > 0) {
      this.textContent = this.padToViewport(placeholder, cols, rows);
      return;
    }

    this.textContent = this.padToViewport('', cols, rows);
  }

  /**
   * Pads text content to fill the full cols × rows viewport so the
   * element maintains its intrinsic height before the editing system
   * takes over.
   */
  private padToViewport(text: string, cols: number, rows: number): string {
    const lines = text.split('\n');
    const padded: string[] = [];

    for (let row = 0; row < rows; row++) {
      const line = lines[row] ?? '';
      const padAmount = Math.max(0, cols - line.length);
      padded.push(line + ' '.repeat(padAmount));
    }

    return padded.join('\n');
  }

  private getCols(): number {
    const raw = this.getAttribute('cols');
    if (raw == null) return DEFAULT_UI_TEXTAREA_COLS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_UI_TEXTAREA_COLS) return DEFAULT_UI_TEXTAREA_COLS;
    return parsed;
  }

  private getRows(): number {
    const raw = this.getAttribute('rows');
    if (raw == null) return DEFAULT_UI_TEXTAREA_ROWS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_UI_TEXTAREA_ROWS) return DEFAULT_UI_TEXTAREA_ROWS;
    return parsed;
  }

  private getPlaceholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
