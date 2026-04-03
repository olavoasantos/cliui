import styles from './styles.css?inline';

import {FORM_OBSERVED_ATTRIBUTES, FORM_TAG_NAME} from './constants';
import {Event, HTMLElement} from '@cliui/dom';
import type {Element, KeyboardEvent} from '@cliui/dom';
import {EDITABLE} from '@cliui/terminal';

/**
 * Built-in terminal form custom element for semantic form grouping.
 *
 * Acts as a block container that:
 * - Dispatches a bubbling `submit` event when a child
 *   `<button type="submit">` is clicked.
 * - Dispatches a bubbling `submit` event when **Enter** is pressed
 *   inside a child editable element (single-line input).
 * - Provides a `reset()` method that clears the `value` attribute on
 *   all child `<input>` and `<textarea>` elements and dispatches a
 *   `reset` event.
 * - Provides a `submit()` method that dispatches a `submit` event.
 * - Provides an `elements` getter returning contained form controls.
 *
 * All submit dispatching is suppressed while the `disabled` attribute
 * is present.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('form', Form)`.
 */
export class Form extends HTMLElement {
  static override readonly observedAttributes = FORM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = FORM_TAG_NAME;

  /** Bound event handlers for cleanup. */
  private readonly boundClick = this.handleClick.bind(this) as never;
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;

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
   * Returns all contained form control elements (`<input>`,
   * `<textarea>`, `<select>`, `<button>`).
   */
  get elements(): Element[] {
    const controls: Element[] = [];

    for (const tag of ['input', 'textarea', 'select', 'button']) {
      const found = this.querySelectorAll(tag);

      for (const el of found) {
        controls.push(el);
      }
    }

    return controls;
  }

  /**
   * Clears the `value` attribute on all child `<input>` and
   * `<textarea>` elements and dispatches a `reset` event.
   */
  reset(): void {
    const inputs = this.querySelectorAll('input');
    const textareas = this.querySelectorAll('textarea');

    for (const input of inputs) {
      input.setAttribute('value', '');
    }

    for (const textarea of textareas) {
      textarea.setAttribute('value', '');
    }

    this.dispatchEvent(
      new Event('reset', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  /**
   * Dispatches a `submit` event on the form.
   */
  submit(): void {
    this.dispatchSubmit();
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleClick(event: Event): void {
    if (this.isDisabled()) return;

    const target = event.target as Element | null;

    if (this.isSubmitButton(target)) {
      this.dispatchSubmit();
    }
  }

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) return;

    const key = (event as KeyboardEvent).key;

    if (key !== 'Enter') return;

    const target = event.target as Element | null;

    if (target && this.isSingleLineEditable(target)) {
      this.dispatchSubmit();
    }
  }

  private isSubmitButton(target: Element | null): boolean {
    if (!target) return false;

    return target.localName === 'button' && target.getAttribute('type') === 'submit';
  }

  private isSingleLineEditable(target: Element | null): boolean {
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
