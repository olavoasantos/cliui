import styles from './styles.css?inline';

import {UI_LIST_OBSERVED_ATTRIBUTES, UI_LIST_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {Element} from '../../dom';
import type {UiListMode} from './types';

/**
 * Built-in terminal interactive list custom element.
 *
 * Manages a list of child elements with keyboard navigation
 * (arrow keys to move highlight, Enter to select). Supports
 * `single` and `multi` selection modes.
 *
 * Dispatches a `select` event when an item is selected via Enter,
 * with the highlighted item's `value` attribute (or text content)
 * available via `getSelectedValue()`.
 *
 * Register with `window.customElements.define(UiList.tagName, UiList)`
 * before creating `<ui-list>` elements in a window.
 */
export class UiList extends HTMLElement {
  static override readonly observedAttributes = UI_LIST_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_LIST_TAG_NAME;

  private highlightIndex = 0;
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.syncHighlight();
    this.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Returns the current selection mode. */
  getMode(): UiListMode {
    return this.getAttribute('mode') === 'multi' ? 'multi' : 'single';
  }

  /** Returns the zero-based index of the highlighted item. */
  getHighlightIndex(): number {
    return this.highlightIndex;
  }

  /** Returns the value of the currently highlighted item. */
  getSelectedValue(): string | null {
    const items = this.getItems();
    const item = items[this.highlightIndex];

    if (!item) return null;

    return item.getAttribute('value') ?? item.textContent ?? null;
  }

  /* ── Private ────────────────────────────────────────────── */

  private getItems(): Element[] {
    const items: Element[] = [];

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i] as Element;

      if (!child.hasAttribute('disabled')) {
        items.push(child);
      }
    }

    return items;
  }

  private syncHighlight(): void {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i] as Element;

      if (i === this.highlightIndex) {
        child.setAttribute('highlighted', '');
      } else {
        child.removeAttribute('highlighted');
      }
    }
  }

  private handleKeyDown(event: Event): void {
    if (event.target !== this) return;

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

      const item = items[this.highlightIndex];

      if (item) {
        if (this.getMode() === 'multi') {
          if (item.hasAttribute('selected')) {
            item.removeAttribute('selected');
          } else {
            item.setAttribute('selected', '');
          }
        } else {
          // Single mode: deselect all, select current
          for (const i of items) {
            i.removeAttribute('selected');
          }

          item.setAttribute('selected', '');
        }

        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    }
  }
}
