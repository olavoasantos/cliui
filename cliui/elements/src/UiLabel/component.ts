import styles from './styles.css?inline';

import {UI_LABEL_OBSERVED_ATTRIBUTES, UI_LABEL_TAG_NAME} from './constants';
import {Event, HTMLElement} from '@cliui/dom';

import type {Document, Element} from '@cliui/dom';

/**
 * Built-in terminal label custom element for form fields.
 *
 * Associates with an input element via the `for` attribute. When the
 * label is clicked, focus is forwarded to the target input identified
 * by its `id` attribute.
 *
 * Register with `window.customElements.define(UiLabel.tagName, UiLabel)`
 * before creating `<ui-label>` elements in a window.
 */
export class UiLabel extends HTMLElement {
  static override readonly observedAttributes = UI_LABEL_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_LABEL_TAG_NAME;

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
    // Prevent EventDispatcher from focusing an ancestor on mousedown;
    // the click handler will focus the target input instead.
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
