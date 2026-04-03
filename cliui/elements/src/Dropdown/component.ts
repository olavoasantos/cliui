import styles from './styles.css?inline';

import {DROPDOWN_OBSERVED_ATTRIBUTES, DROPDOWN_TAG_NAME} from './constants';
import {Event, HTMLElement} from '@cliui/dom';
import type {Element, KeyboardEvent} from '@cliui/dom';

import type {Navmenu} from '../Navmenu/component';

/**
 * Built-in terminal dropdown trigger custom element.
 *
 * Wraps a trigger element and a `<navmenu>`. When activated (Enter or
 * Space), opens the child `<navmenu>`. The menu closes on Escape or
 * item selection.
 *
 * Register with `window.customElements.define(Dropdown.tagName, Dropdown)`
 * before creating `<dropdown>` elements in a window.
 */
export class Dropdown extends HTMLElement {
  static override readonly observedAttributes = DROPDOWN_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = DROPDOWN_TAG_NAME;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;
  private readonly boundClick = this.handleDropdownClick.bind(this) as never;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
  }

  /** Finds the child `<navmenu>` element. */
  getMenu(): Navmenu | null {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i]!.localName === 'navmenu') {
        return this.children[i] as unknown as Navmenu;
      }
    }

    return null;
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.hasAttribute('disabled')) return;
    if (event.target !== this) return;

    const key = (event as KeyboardEvent).key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();

      const menu = this.getMenu();

      if (menu) {
        menu.open();
      }
    }
  }

  private handleDropdownClick(event: Event): void {
    if (this.hasAttribute('disabled')) return;

    // Only open if the click was on the dropdown itself, not on the menu
    const target = event.target as Element | null;
    let current: Element | null = target;

    while (current && current !== (this as unknown as Element)) {
      if (current.localName === 'navmenu') return; // Click inside menu, let menu handle it

      current = current.parentElement as Element | null;
    }

    const menu = this.getMenu();

    if (menu) {
      menu.open();
    }
  }
}
