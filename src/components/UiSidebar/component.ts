import styles from './styles.css?inline';

import {UI_SIDEBAR_OBSERVED_ATTRIBUTES, UI_SIDEBAR_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal sidebar panel custom element.
 *
 * Renders as a fixed-width block panel. Set the `width` attribute
 * to control the panel width in columns. Toggle visibility with
 * the `collapsed` attribute.
 *
 * Register with `window.customElements.define(UiSidebar.tagName, UiSidebar)`
 * before creating `<ui-sidebar>` elements in a window.
 */
export class UiSidebar extends HTMLElement {
  static override readonly observedAttributes = UI_SIDEBAR_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_SIDEBAR_TAG_NAME;

  connectedCallback(): void {
    this.syncWidth();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'width') {
      this.syncWidth();
    }
  }

  /** Whether the sidebar is collapsed. */
  isCollapsed(): boolean {
    return this.hasAttribute('collapsed');
  }

  /** Toggles collapsed state. */
  toggle(): void {
    if (this.isCollapsed()) {
      this.removeAttribute('collapsed');
    } else {
      this.setAttribute('collapsed', '');
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  private syncWidth(): void {
    const raw = this.getAttribute('width');

    if (raw) {
      this.style.width = raw;
    }
  }
}
