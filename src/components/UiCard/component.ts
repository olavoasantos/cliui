import styles from './styles.css?inline';

import {UI_CARD_OBSERVED_ATTRIBUTES, UI_CARD_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';
import type {Element, Node} from '../../dom';

/**
 * Built-in terminal card custom element for bordered content panels.
 *
 * Renders a bordered block container with optional `header` and
 * `footer` text. The header renders bold above the content, and
 * the footer renders below.
 *
 * Register with `window.customElements.define(UiCard.tagName, UiCard)`
 * before creating `<ui-card>` elements in a window.
 */
export class UiCard extends HTMLElement {
  static override readonly observedAttributes = UI_CARD_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_CARD_TAG_NAME;

  /** Internal header element. */
  private headerEl: Element | null = null;

  /** Internal footer element. */
  private footerEl: Element | null = null;

  /** Wrapper for user-provided child content. */
  private contentWrapper: Element | null = null;

  connectedCallback(): void {
    this.buildInternals();
    this.syncHeader();
    this.syncFooter();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'header') this.syncHeader();
    if (name === 'footer') this.syncFooter();
  }

  /* ── Private ────────────────────────────────────────────── */

  private buildInternals(): void {
    if (this.contentWrapper) return;

    const doc = this.ownerDocument!;

    const children: Node[] = [];

    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      children.unshift(this.childNodes[i]!);
      this.removeChild(this.childNodes[i]!);
    }

    this.headerEl = doc.createElement('div');
    this.headerEl.setAttribute('class', 'ui-card-header');
    this.headerEl.style.display = 'none';
    this.headerEl.style.fontWeight = 'bold';

    this.contentWrapper = doc.createElement('div');
    this.contentWrapper.setAttribute('class', 'ui-card-content');
    this.contentWrapper.style.display = 'block';

    for (const child of children) {
      this.contentWrapper.appendChild(child);
    }

    this.footerEl = doc.createElement('div');
    this.footerEl.setAttribute('class', 'ui-card-footer');
    this.footerEl.style.display = 'none';

    this.appendChild(this.headerEl);
    this.appendChild(this.contentWrapper);
    this.appendChild(this.footerEl);
  }

  private syncHeader(): void {
    if (!this.headerEl) return;

    const header = this.getAttribute('header');

    if (header) {
      this.headerEl.textContent = header;
      this.headerEl.style.display = 'block';
    } else {
      this.headerEl.textContent = '';
      this.headerEl.style.display = 'none';
    }
  }

  private syncFooter(): void {
    if (!this.footerEl) return;

    const footer = this.getAttribute('footer');

    if (footer) {
      this.footerEl.textContent = footer;
      this.footerEl.style.display = 'block';
    } else {
      this.footerEl.textContent = '';
      this.footerEl.style.display = 'none';
    }
  }
}
