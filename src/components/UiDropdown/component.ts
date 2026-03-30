import styles from './styles.css?inline';

import {UI_DROPDOWN_OBSERVED_ATTRIBUTES, UI_DROPDOWN_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {UiMenu} from '../UiMenu/component';

/**
 * Built-in terminal dropdown trigger custom element.
 *
 * Wraps a trigger element and a `<ui-menu>`. When activated (Enter or
 * Space), opens the child `<ui-menu>`. The menu closes on Escape or
 * item selection.
 *
 * Register with `window.customElements.define(UiDropdown.tagName, UiDropdown)`
 * before creating `<ui-dropdown>` elements in a window.
 */
export class UiDropdown extends HTMLElement {
  static override readonly observedAttributes = UI_DROPDOWN_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_DROPDOWN_TAG_NAME;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Finds the child `<ui-menu>` element. */
  getMenu(): UiMenu | null {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i]!.localName === 'ui-menu') {
        return this.children[i] as unknown as UiMenu;
      }
    }

    return null;
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.hasAttribute('disabled')) return;
    if (event.target !== this) return;

    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();

      const menu = this.getMenu();

      if (menu) {
        menu.open();
      }
    }
  }
}
