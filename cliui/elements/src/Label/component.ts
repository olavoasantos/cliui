import styles from './styles.css?inline';

import {LABEL_OBSERVED_ATTRIBUTES, LABEL_TAG_NAME} from './constants';
import {Event, HTMLElement} from '@cliui/dom';

import type {Document, Element} from '@cliui/dom';

/**
 * Built-in terminal label custom element for form fields.
 *
 * Associates with an input element via the `for` attribute (also
 * accessible as `htmlFor`). When the label is clicked, focus is
 * forwarded to the target input identified by its `id` attribute.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('label', Label)`.
 */
export class Label extends HTMLElement {
  static override readonly observedAttributes = LABEL_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = LABEL_TAG_NAME;

  private readonly boundMouseDown = this.handleMouseDown.bind(this) as never;
  private readonly boundClick = this.handleClick.bind(this) as never;

  connectedCallback(): void {
    this.addEventListener('mousedown', this.boundMouseDown);
    this.addEventListener('click', this.boundClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('mousedown', this.boundMouseDown);
    this.removeEventListener('click', this.boundClick);
  }

  /**
   * Alias for the `for` attribute, matching the standard
   * `HTMLLabelElement.htmlFor` property.
   */
  get htmlFor(): string {
    return this.getAttribute('for') ?? '';
  }

  set htmlFor(value: string) {
    this.setAttribute('for', value);
  }

  /**
   * Returns the associated element identified by the `for` attribute,
   * or `null` if no match is found.
   */
  getTarget(): Element | null {
    const forId = this.getAttribute('for');

    if (!forId) return null;

    return (this.ownerDocument as Document).querySelector(`#${forId}`);
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleMouseDown(event: Event): void {
    if (this.getAttribute('for') && !this.hasAttribute('disabled')) {
      event.preventDefault();
    }
  }

  private handleClick(_event: Event): void {
    if (this.hasAttribute('disabled')) return;

    const target = this.getTarget();

    if (target) {
      (this.ownerDocument as Document).setActiveElement(target);
    }
  }
}
