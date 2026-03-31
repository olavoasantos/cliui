import styles from './styles.css?inline';

import {UI_TREE_OBSERVED_ATTRIBUTES, UI_TREE_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {UiTreeItem} from '../UiTreeItem/component';

/**
 * Built-in terminal tree view custom element.
 *
 * Contains `<ui-tree-item>` children arranged in a collapsible
 * hierarchy. Arrow Up/Down navigates between visible items.
 * Arrow Right expands, Arrow Left collapses. Enter dispatches
 * a `select` event with the focused item's value.
 *
 * Register with `window.customElements.define(UiTree.tagName, UiTree)`
 * before creating `<ui-tree>` elements in a window.
 */
export class UiTree extends HTMLElement {
  static override readonly observedAttributes = UI_TREE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TREE_TAG_NAME;

  /** Index of the currently highlighted item in the visible list. */
  private highlightedIndex = 0;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    this.ensureTabIndex();
    this.addEventListener('keydown', this.boundKeyDown);
    this.syncHighlight();
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Returns all currently visible tree items in document order. */
  getVisibleItems(): UiTreeItem[] {
    return this.collectVisible(this as unknown as import('../../dom').Element, 0);
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    const key = (event as import('../../dom').KeyboardEvent).key;
    const items = this.getVisibleItems();

    if (items.length === 0) return;

    if (key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, items.length - 1);
      this.syncHighlight();
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      this.syncHighlight();
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      const item = items[this.highlightedIndex];

      if (item && item.hasAttribute('expandable') && !item.hasAttribute('open')) {
        item.setAttribute('open', '');
      }
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      const item = items[this.highlightedIndex];

      if (item && item.hasAttribute('open')) {
        item.removeAttribute('open');
      }
    } else if (key === 'Enter') {
      event.preventDefault();
      const item = items[this.highlightedIndex];

      if (item) {
        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    }
  }

  private syncHighlight(): void {
    const items = this.getVisibleItems();

    for (let i = 0; i < items.length; i++) {
      if (i === this.highlightedIndex) {
        items[i]!.setAttribute('highlighted', '');
      } else {
        items[i]!.removeAttribute('highlighted');
      }
    }
  }

  private collectVisible(parent: import('../../dom').Element, depth: number): UiTreeItem[] {
    const result: UiTreeItem[] = [];

    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];

      if (
        child &&
        'localName' in child &&
        (child as import('../../dom').Element).localName === 'ui-tree-item'
      ) {
        const item = child as unknown as UiTreeItem;
        item.setDepth(depth);
        result.push(item);

        if (item.hasAttribute('expandable') && item.hasAttribute('open')) {
          result.push(...this.collectVisible(child as import('../../dom').Element, depth + 1));
        }
      }
    }

    return result;
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
