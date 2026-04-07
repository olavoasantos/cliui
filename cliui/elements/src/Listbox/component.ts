import styles from './styles.css?inline';

import {LISTBOX_OBSERVED_ATTRIBUTES, LISTBOX_TAG_NAME} from './constants';
import {Event, HTMLElement, type Element, type KeyboardEvent} from '@cliui/dom';
import type {ListboxMode} from './types';

/**
 * Built-in terminal interactive list custom element.
 *
 * Manages a list of child elements with keyboard navigation
 * (arrow keys to move highlight, Enter to select). Supports
 * `single` and `multi` selection modes.
 *
 * **Single mode:** Enter or click selects the highlighted item.
 * **Multi mode:** Enter or click toggles. Shift+Arrow extends
 * the selection. Ctrl+Click toggles individual items without
 * clearing. Shift+Click selects a range from the last selected
 * item to the clicked item.
 *
 * Dispatches a `select` event when selection changes.
 *
 * Register with `window.customElements.define(Listbox.tagName, Listbox)`
 * before creating `<listbox>` elements in a window.
 */
export class Listbox extends HTMLElement {
  static override readonly observedAttributes = LISTBOX_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = LISTBOX_TAG_NAME;

  private highlightIndex = 0;

  /** Last index used as the anchor for Shift range selection. */
  private rangeAnchor = 0;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;
  private readonly boundClick = this.handleClick.bind(this) as never;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.syncHighlight();
    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
  }

  /** Returns the current selection mode. */
  getMode(): ListboxMode {
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

  /** Returns the values of all selected items (useful in multi mode). */
  getSelectedValues(): string[] {
    const items = this.getItems();
    const values: string[] = [];

    for (const item of items) {
      if (item.hasAttribute('selected')) {
        values.push(item.getAttribute('value') ?? item.textContent ?? '');
      }
    }

    return values;
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

    const key = (event as KeyboardEvent).key;
    const shift = !!(event as unknown as {shiftKey?: boolean}).shiftKey;
    const items = this.getItems();

    if (items.length === 0) return;

    if (key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex = this.highlightIndex <= 0 ? items.length - 1 : this.highlightIndex - 1;
      this.syncHighlight();

      if (shift && this.getMode() === 'multi') {
        this.selectRange(this.rangeAnchor, this.highlightIndex, items);
        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = this.highlightIndex >= items.length - 1 ? 0 : this.highlightIndex + 1;
      this.syncHighlight();

      if (shift && this.getMode() === 'multi') {
        this.selectRange(this.rangeAnchor, this.highlightIndex, items);
        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();

      const item = items[this.highlightIndex];

      if (item) {
        if (this.getMode() === 'multi') {
          if (item.hasAttribute('selected')) {
            item.removeAttribute('selected');
          } else {
            item.setAttribute('selected', '');
          }

          this.rangeAnchor = this.highlightIndex;
        } else {
          for (const i of items) {
            i.removeAttribute('selected');
          }

          item.setAttribute('selected', '');
        }

        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    } else if (key === 'a' && !!(event as unknown as {ctrlKey?: boolean}).ctrlKey) {
      /* Ctrl+A selects all in multi mode */
      if (this.getMode() === 'multi') {
        event.preventDefault();

        for (const item of items) {
          item.setAttribute('selected', '');
        }

        this.dispatchEvent(new Event('select', {bubbles: true}));
      }
    }
  }

  private handleClick(event: Event): void {
    const target = event.target as Element | null;

    if (!target) return;

    const shift = !!(event as unknown as {shiftKey?: boolean}).shiftKey;

    const allChildren = Array.from(
      {length: this.children.length},
      (_, i) => this.children[i] as Element,
    );
    let clickedIndex = -1;

    for (let i = 0; i < allChildren.length; i++) {
      let current: Element | null = target;

      while (current && current !== (this as unknown as Element)) {
        if (current === allChildren[i]) {
          clickedIndex = i;
          break;
        }

        current = current.parentElement as Element | null;
      }

      if (clickedIndex >= 0) break;
    }

    if (clickedIndex < 0) return;

    const child = allChildren[clickedIndex] as Element;

    if (child.hasAttribute('disabled')) return;

    this.highlightIndex = clickedIndex;
    this.syncHighlight();

    const items = this.getItems();
    const item = items[this.highlightIndex];

    if (!item) return;

    if (this.getMode() === 'multi') {
      if (shift) {
        /* Shift+Click: select range from anchor to clicked */
        this.selectRange(this.rangeAnchor, this.highlightIndex, items);
      } else {
        /* Click: toggle individual item */
        if (item.hasAttribute('selected')) {
          item.removeAttribute('selected');
        } else {
          item.setAttribute('selected', '');
        }

        this.rangeAnchor = this.highlightIndex;
      }
    } else {
      for (const i of items) {
        i.removeAttribute('selected');
      }

      item.setAttribute('selected', '');
    }

    this.dispatchEvent(new Event('select', {bubbles: true}));
  }

  /**
   * Selects all items between `from` and `to` (inclusive),
   * deselecting everything else.
   */
  private selectRange(from: number, to: number, items: Element[]): void {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);

    for (let i = 0; i < items.length; i++) {
      if (i >= lo && i <= hi) {
        items[i]!.setAttribute('selected', '');
      } else {
        items[i]!.removeAttribute('selected');
      }
    }
  }
}
