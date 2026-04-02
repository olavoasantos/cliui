import styles from './styles.css?inline';

import {
  DEFAULT_UI_BREADCRUMBS_SEPARATOR,
  UI_BREADCRUMBS_OBSERVED_ATTRIBUTES,
  UI_BREADCRUMBS_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';
import type {Element} from '../../dom';

/**
 * Built-in terminal breadcrumbs container custom element.
 *
 * Renders `<ui-breadcrumb>` children inline with a configurable
 * separator character between segments. Set the `separator`
 * attribute to override the default `›`.
 *
 * Register with `window.customElements.define(UiBreadcrumbs.tagName, UiBreadcrumbs)`
 * before creating `<ui-breadcrumbs>` elements in a window.
 */
export class UiBreadcrumbs extends HTMLElement {
  static override readonly observedAttributes = UI_BREADCRUMBS_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_BREADCRUMBS_TAG_NAME;

  connectedCallback(): void {
    this.renderSegments();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'separator') {
      this.renderSegments();
    }
  }

  /** Returns the configured separator character. */
  getSeparator(): string {
    return this.getAttribute('separator') ?? DEFAULT_UI_BREADCRUMBS_SEPARATOR;
  }

  /* ── Private ────────────────────────────────────────────── */

  /**
   * Rebuilds the visible content by collecting segment text and
   * joining with the separator character.
   */
  private renderSegments(): void {
    const sep = this.getSeparator();
    const texts: string[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'ui-breadcrumb') {
        texts.push((child as Element).textContent ?? '');
      }
    }

    /* Replace visible content with joined text while keeping
       the original breadcrumb children in the DOM for API access. */
    const doc = this.ownerDocument!;

    /* Remove any previously rendered text span */
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      const child = this.childNodes[i];

      if (
        child &&
        'getAttribute' in child &&
        (child as Element).getAttribute('class') === 'ui-breadcrumbs-rendered'
      ) {
        this.removeChild(child);
      }
    }

    const rendered = doc.createElement('span');
    rendered.setAttribute('class', 'ui-breadcrumbs-rendered');
    rendered.style.display = 'inline';
    rendered.textContent = texts.join(` ${sep} `);
    this.appendChild(rendered);
  }
}
