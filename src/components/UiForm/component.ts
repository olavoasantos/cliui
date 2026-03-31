import styles from './styles.css?inline';

import {UI_FORM_OBSERVED_ATTRIBUTES, UI_FORM_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';
import {EDITABLE} from '../../terminal/constants/editable';

/**
 * Built-in terminal form custom element for semantic form grouping.
 *
 * Acts as a block container that:
 * - Dispatches a bubbling `submit` event when a child
 *   `<ui-button type="submit">` is clicked.
 * - Dispatches a bubbling `submit` event when **Enter** is pressed
 *   inside a child editable element (single-line input).
 * - Provides a `reset()` method that clears the `value` attribute on
 *   all child `<ui-input>` and `<ui-textarea>` elements.
 *
 * All submit dispatching is suppressed while the `disabled` attribute
 * is present.
 *
 * Register with `window.customElements.define(UiForm.tagName, UiForm)`
 * before creating `<ui-form>` elements in a window.
 */
export class UiForm extends HTMLElement {
  static override readonly observedAttributes = UI_FORM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_FORM_TAG_NAME;

  /** Bound event handlers for cleanup. */
  private readonly boundClick = this.handleClick.bind(this) as EventListener;
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    this.addEventListener('click', this.boundClick);
    this.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.boundClick);
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Whether the form is currently disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /**
   * Clears the `value` attribute on all child `<ui-input>` and
   * `<ui-textarea>` elements within this form.
   */
  reset(): void {
    const inputs = this.querySelectorAll('ui-input');
    const textareas = this.querySelectorAll('ui-textarea');

    for (const input of inputs) {
      input.setAttribute('value', '');
    }

    for (const textarea of textareas) {
      textarea.setAttribute('value', '');
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleClick(event: Event): void {
    if (this.isDisabled()) return;

    const target = event.target as import('../../dom').Element | null;

    if (this.isSubmitButton(target)) {
      this.dispatchSubmit();
    }
  }

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) return;

    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key !== 'Enter') return;

    const target = event.target as import('../../dom').Element | null;

    if (target && this.isSingleLineEditable(target)) {
      this.dispatchSubmit();
    }
  }

  private isSubmitButton(target: import('../../dom').Element | null): boolean {
    if (!target) return false;

    return target.localName === 'ui-button' && target.getAttribute('type') === 'submit';
  }

  private isSingleLineEditable(target: import('../../dom').Element | null): boolean {
    if (!target) return false;

    const config = (target as unknown as Record<symbol, unknown>)[EDITABLE];

    if (!config || typeof config !== 'object') return false;

    return (config as {multiLine?: boolean}).multiLine !== true;
  }

  private dispatchSubmit(): void {
    this.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }
}
