import styles from './styles.css?inline';

import {UI_FIELDSET_OBSERVED_ATTRIBUTES, UI_FIELDSET_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';
import type {Element, Node} from '../../dom';

/**
 * Built-in terminal fieldset custom element for grouping related form
 * fields with an optional legend.
 *
 * Renders a bordered block container. When a `legend` attribute is set,
 * it displays a title row above the content. The element is always
 * expanded — unlike `<ui-details>`, it is non-collapsible.
 *
 * Register with `window.customElements.define(UiFieldset.tagName, UiFieldset)`
 * before creating `<ui-fieldset>` elements in a window.
 */
export class UiFieldset extends HTMLElement {
  static override readonly observedAttributes = UI_FIELDSET_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_FIELDSET_TAG_NAME;

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
    this.legendEl.setAttribute('class', 'ui-fieldset-legend');
    this.legendEl.style.display = 'none';
    this.legendEl.style.fontWeight = 'bold';

    /* Build content wrapper */
    this.contentWrapper = doc.createElement('div');
    this.contentWrapper.setAttribute('class', 'ui-fieldset-content');
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
}
