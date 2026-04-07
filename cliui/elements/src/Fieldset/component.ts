import styles from './styles.css?inline';

import {FIELDSET_OBSERVED_ATTRIBUTES, FIELDSET_TAG_NAME} from './constants';
import {HTMLElement, type Element, type Node} from '@cliui/dom';

/**
 * Built-in terminal fieldset custom element for grouping related form
 * fields with an optional legend.
 *
 * Renders a bordered block container. When a `legend` attribute is set,
 * it displays a title row above the content. When `disabled` is set,
 * all child form controls are visually disabled.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('fieldset', Fieldset)`.
 */
export class Fieldset extends HTMLElement {
  static override readonly observedAttributes = FIELDSET_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = FIELDSET_TAG_NAME;

  /** Internal legend element rendered above content. */
  private legendEl: Element | null = null;

  /** Wrapper for user-provided child content. */
  private contentWrapper: Element | null = null;

  connectedCallback(): void {
    this.buildInternals();
    this.syncLegend();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'legend') {
      this.syncLegend();
    }

    if (name === 'disabled') {
      this.propagateDisabled(newValue != null);
    }
  }

  /** Whether the fieldset is currently disabled. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /* ── Private: DOM structure ─────────────────────────────── */

  private buildInternals(): void {
    if (this.contentWrapper) return;

    const doc = this.ownerDocument!;

    /* Collect existing children */
    const children: Node[] = [];

    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      children.unshift(this.childNodes[i]!);
      this.removeChild(this.childNodes[i]!);
    }

    /* Build legend element (hidden by default) */
    this.legendEl = doc.createElement('div');
    this.legendEl.setAttribute('class', 'fieldset-legend');
    this.legendEl.style.display = 'none';
    this.legendEl.style.fontWeight = 'bold';

    /* Build content wrapper */
    this.contentWrapper = doc.createElement('div');
    this.contentWrapper.setAttribute('class', 'fieldset-content');
    this.contentWrapper.style.display = 'block';

    for (const child of children) {
      this.contentWrapper.appendChild(child);
    }

    /* Attach internals */
    this.appendChild(this.legendEl);
    this.appendChild(this.contentWrapper);
  }

  /* ── Private: State sync ────────────────────────────────── */

  private syncLegend(): void {
    if (!this.legendEl) return;

    const legend = this.getAttribute('legend');

    if (legend) {
      this.legendEl.textContent = legend;
      this.legendEl.style.display = 'block';
    } else {
      this.legendEl.textContent = '';
      this.legendEl.style.display = 'none';
    }
  }

  /**
   * Propagates disabled state to child form controls.
   */
  private propagateDisabled(isDisabled: boolean): void {
    for (const tag of ['input', 'textarea', 'select', 'button']) {
      const controls = this.querySelectorAll(tag);

      for (const control of controls) {
        if (isDisabled) {
          control.setAttribute('disabled', '');
        } else {
          control.removeAttribute('disabled');
        }
      }
    }
  }
}
