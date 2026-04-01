import styles from './styles.css?inline';

import {UI_MENU_OBSERVED_ATTRIBUTES, UI_MENU_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {UiMenuItem} from '../UiMenuItem/component';

/**
 * Built-in terminal menu custom element.
 *
 * A positioned list of `<ui-menu-item>` elements with keyboard navigation.
 * Arrow up/down moves the highlight, Enter selects, Escape closes.
 *
 * Dispatches a `select` event when an item is chosen, with the item's
 * `value` attribute available from the event target.
 *
 * Register with `window.customElements.define(UiMenu.tagName, UiMenu)`
 * before creating `<ui-menu>` elements in a window.
 */
export class UiMenu extends HTMLElement {
  static override readonly observedAttributes = UI_MENU_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_MENU_TAG_NAME;

  private highlightIndex = 0;
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundClick = this.handleClick.bind(this) as EventListener;

  /** Bound document click handler for close-on-click-outside. */
  private readonly boundDocClick = this.handleDocumentClick.bind(this) as EventListener;

  connectedCallback(): void {
    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
    this.removeDocumentClickListener();
  }

  /** Opens the menu and sets focus for keyboard navigation. */
  open(): void {
    if (this.hasAttribute('open')) return;

    this.setAttribute('open', '');
    this.highlightIndex = 0;
    this.syncHighlight();

    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    const doc = this.ownerDocument as import('../../dom').Document;
    doc.setActiveElement(this);
    this.addDocumentClickListener();
  }

  /** Closes the menu and returns focus to the parent trigger. */
  close(): void {
    this.removeAttribute('open');
    this.removeDocumentClickListener();

    /* Return focus to the parent dropdown trigger if present */
    const parent = this.parentElement as import('../../dom').Element | null;

    if (parent && parent.localName === 'ui-dropdown') {
      const doc = this.ownerDocument as import('../../dom').Document;
      doc.setActiveElement(parent);
    }
  }

  /** Returns the value of the currently highlighted item. */
  getHighlightedValue(): string | null {
    const items = this.getItems();
    const item = items[this.highlightIndex];

    if (!item) return null;

    return item.getAttribute('value') ?? item.textContent ?? null;
  }

  /* ── Private ────────────────────────────────────────────── */

  private getItems(): UiMenuItem[] {
    const items: UiMenuItem[] = [];

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i] as import('../../dom').Element;

      if (child.localName === 'ui-menu-item' && !child.hasAttribute('disabled')) {
        items.push(child as unknown as UiMenuItem);
      }
    }

    return items;
  }

  private syncHighlight(): void {
    const items = this.getItems();

    for (let i = 0; i < items.length; i++) {
      if (i === this.highlightIndex) {
        items[i]!.setAttribute('highlighted', '');
      } else {
        items[i]!.removeAttribute('highlighted');
      }
    }
  }

  private handleKeyDown(event: Event): void {
    const key = (event as import('../../dom').KeyboardEvent).key;
    const items = this.getItems();

    if (items.length === 0) return;

    if (key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex = this.highlightIndex <= 0 ? items.length - 1 : this.highlightIndex - 1;
      this.syncHighlight();
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = this.highlightIndex >= items.length - 1 ? 0 : this.highlightIndex + 1;
      this.syncHighlight();
    } else if (key === 'Enter') {
      event.preventDefault();
      this.dispatchEvent(new Event('select', {bubbles: true}));
      this.close();
    } else if (key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  private handleClick(event: Event): void {
    const target = event.target as import('../../dom').Element | null;

    if (!target) return;

    // Walk up from click target to find a menu item
    let current: import('../../dom').Element | null = target;

    while (current && current !== (this as unknown as import('../../dom').Element)) {
      if (current.localName === 'ui-menu-item' && !current.hasAttribute('disabled')) {
        // Find the index among non-disabled items
        const items = this.getItems();
        const idx = items.indexOf(current as unknown as UiMenuItem);

        if (idx >= 0) {
          this.highlightIndex = idx;
          this.syncHighlight();
          this.dispatchEvent(new Event('select', {bubbles: true}));
          this.close();
        }

        return;
      }

      current = current.parentElement as import('../../dom').Element | null;
    }
  }

  /* ── Document click listener ─────────────────────────────── */

  private handleDocumentClick(event: Event): void {
    const target = event.target as import('../../dom').Element | null;

    if (!target) return;

    /* Walk up from target — if we reach this menu or its parent
       dropdown, the click is inside and should be ignored. */
    let current: import('../../dom').Element | null = target;
    const self = this as unknown as import('../../dom').Element;
    const parent = this.parentElement as import('../../dom').Element | null;

    while (current) {
      if (current === self || (parent && current === parent)) return;
      current = current.parentElement as import('../../dom').Element | null;
    }

    this.close();
  }

  private addDocumentClickListener(): void {
    const doc = this.ownerDocument;
    if (!doc) return;
    doc.body.addEventListener('click', this.boundDocClick);
  }

  private removeDocumentClickListener(): void {
    const doc = this.ownerDocument;
    if (!doc) return;
    doc.body.removeEventListener('click', this.boundDocClick);
  }
}
