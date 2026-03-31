import styles from './styles.css?inline';

import {
  DEFAULT_UI_BREADCRUMBS_SEPARATOR,
  UI_BREADCRUMBS_OBSERVED_ATTRIBUTES,
  UI_BREADCRUMBS_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

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
    this.insertSeparators();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'separator') {
      this.updateSeparators();
    }
  }

  /** Returns the configured separator character. */
  getSeparator(): string {
    return this.getAttribute('separator') ?? DEFAULT_UI_BREADCRUMBS_SEPARATOR;
  }

  /* ── Private ────────────────────────────────────────────── */

  private insertSeparators(): void {
    const doc = this.ownerDocument!;
    const sep = this.getSeparator();
    const segments = this.collectSegments();

    for (let i = segments.length - 1; i > 0; i--) {
      const sepEl = doc.createElement('span');
      sepEl.setAttribute('class', 'ui-breadcrumbs-separator');
      sepEl.style.display = 'inline';
      sepEl.textContent = sep;

      const after = segments[i]!;
      this.insertBefore(
        sepEl as unknown as import('../../dom').Node,
        after as unknown as import('../../dom').Node,
      );
    }
  }

  private updateSeparators(): void {
    const sep = this.getSeparator();

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (
        child &&
        'getAttribute' in child &&
        (child as import('../../dom').Element).getAttribute('class') === 'ui-breadcrumbs-separator'
      ) {
        (child as import('../../dom').Element).textContent = sep;
      }
    }
  }

  private collectSegments(): import('../../dom').Element[] {
    const segments: import('../../dom').Element[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (
        child &&
        'localName' in child &&
        (child as import('../../dom').Element).localName === 'ui-breadcrumb'
      ) {
        segments.push(child as import('../../dom').Element);
      }
    }

    return segments;
  }
}
