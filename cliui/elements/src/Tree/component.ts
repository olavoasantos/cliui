import styles from './styles.css?inline';

import {
  TREE_INDENT_SIZE,
  TREE_INDICATOR_COLLAPSED,
  TREE_INDICATOR_EXPANDED,
  TREE_INDICATOR_LEAF,
  TREE_OBSERVED_ATTRIBUTES,
  TREE_TAG_NAME,
} from './constants';
import {
  Event,
  HTMLElement,
  type Document,
  type Element,
  type KeyboardEvent,
  type Node,
} from '@cliui/dom';

import type {TreeItem} from '../TreeItem/component';

/**
 * Flat entry in the visible item list.
 */
interface VisibleEntry {
  /** The original `<treeitem>` element. */
  item: TreeItem;
  /** Nesting depth (0 = root). */
  depth: number;
}

/**
 * Built-in terminal tree view custom element.
 *
 * Contains `<treeitem>` children arranged in a collapsible
 * hierarchy. The tree flattens the visible items into rendered
 * rows — only items whose ancestors are all expanded are shown.
 *
 * Arrow Up/Down navigates between visible items. Arrow Right
 * expands, Arrow Left collapses. Enter dispatches a `select`
 * event with the focused item's value.
 *
 * Register with `window.customElements.define(Tree.tagName, Tree)`
 * before creating `<tree>` elements in a window.
 */
export class Tree extends HTMLElement {
  static override readonly observedAttributes = TREE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = TREE_TAG_NAME;

  /** Index of the currently highlighted item in the visible list. */
  private highlightedIndex = 0;

  /** Cached flat list of visible entries. */
  private visibleEntries: VisibleEntry[] = [];

  /** Rendered row elements (direct children managed by the tree). */
  private renderedRows: Element[] = [];

  /** The original tree-item children (preserved for hierarchy). */
  private sourceItems: TreeItem[] = [];

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;
  private readonly boundClick = this.handleClick.bind(this) as never;

  connectedCallback(): void {
    this.ensureTabIndex();
    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);

    /* Capture the original tree-item children before we replace them */
    this.captureSourceItems();
    this.refresh();
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
  }

  /** Returns all currently visible tree items in document order. */
  getVisibleItems(): TreeItem[] {
    return this.visibleEntries.map((e) => e.item);
  }

  /** Returns the rendered row elements (for testing). */
  getRenderedRows(): Element[] {
    return this.renderedRows;
  }

  /** Returns the highlighted item's value, or null. */
  getHighlightedValue(): string | null {
    const entry = this.visibleEntries[this.highlightedIndex];
    return entry ? entry.item.getValue() : null;
  }

  /** Rebuilds the visible list and re-renders rows. */
  refresh(): void {
    this.visibleEntries = this.collectVisible(this.sourceItems, 0);
    this.highlightedIndex = Math.min(
      this.highlightedIndex,
      Math.max(0, this.visibleEntries.length - 1),
    );
    this.renderRows();
  }

  /* ── Private: Source capture ─────────────────────────────── */

  private captureSourceItems(): void {
    this.sourceItems = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'treeitem') {
        this.sourceItems.push(child as unknown as TreeItem);
      }
    }

    /* Remove source items from DOM — we'll render flat rows instead */
    for (const item of this.sourceItems) {
      if (item.parentNode === (this as unknown as Node)) {
        this.removeChild(item as unknown as Node);
      }
    }
  }

  /* ── Private: Visibility ────────────────────────────────── */

  private collectVisible(items: TreeItem[], depth: number): VisibleEntry[] {
    const result: VisibleEntry[] = [];

    for (const item of items) {
      result.push({item, depth});

      if (item.hasAttribute('expandable') && item.hasAttribute('open')) {
        const children = this.getTreeItemChildren(item);
        result.push(...this.collectVisible(children, depth + 1));
      }
    }

    return result;
  }

  private getTreeItemChildren(item: TreeItem): TreeItem[] {
    const children: TreeItem[] = [];

    for (let i = 0; i < (item as unknown as Element).childNodes.length; i++) {
      const child = (item as unknown as Element).childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'treeitem') {
        children.push(child as unknown as TreeItem);
      }
    }

    return children;
  }

  /* ── Private: Rendering ─────────────────────────────────── */

  private renderRows(): void {
    const doc = this.ownerDocument!;

    /* Clear existing rendered rows */
    for (const row of this.renderedRows) {
      if (row.parentNode === (this as unknown as Node)) {
        this.removeChild(row as unknown as Node);
      }
    }

    this.renderedRows = [];

    for (let i = 0; i < this.visibleEntries.length; i++) {
      const entry = this.visibleEntries[i]!;
      const row = doc.createElement('div');

      /* Build text: indentation + indicator + label */
      const indent = ' '.repeat(entry.depth * TREE_INDENT_SIZE);
      const indicator = entry.item.hasAttribute('expandable')
        ? entry.item.hasAttribute('open')
          ? TREE_INDICATOR_EXPANDED
          : TREE_INDICATOR_COLLAPSED
        : TREE_INDICATOR_LEAF;
      const label = entry.item.getAttribute('value') ?? entry.item.textContent ?? '';

      row.textContent = `${indent}${indicator} ${label}`;
      row.style.whiteSpace = 'pre';

      if (i === this.highlightedIndex) {
        row.setAttribute('highlighted', '');
      }

      this.appendChild(row);
      this.renderedRows.push(row);
    }
  }

  /* ── Private: Keyboard ──────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    const key = (event as KeyboardEvent).key;

    if (this.visibleEntries.length === 0) return;

    if (key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.visibleEntries.length - 1);
      this.syncHighlight();
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      this.syncHighlight();
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      const entry = this.visibleEntries[this.highlightedIndex];

      if (entry && entry.item.hasAttribute('expandable') && !entry.item.hasAttribute('open')) {
        entry.item.setAttribute('open', '');
        this.refresh();
      }
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      const entry = this.visibleEntries[this.highlightedIndex];

      if (entry && entry.item.hasAttribute('open')) {
        entry.item.removeAttribute('open');
        this.refresh();
      }
    } else if (key === 'Enter') {
      event.preventDefault();
      this.dispatchEvent(new Event('select', {bubbles: true}));
    }
  }

  private syncHighlight(): void {
    for (let i = 0; i < this.renderedRows.length; i++) {
      if (i === this.highlightedIndex) {
        this.renderedRows[i]!.setAttribute('highlighted', '');
      } else {
        this.renderedRows[i]!.removeAttribute('highlighted');
      }
    }
  }

  private handleClick(event: Event): void {
    const target = event.target as Element | null;

    if (!target) return;

    /* Find which rendered row was clicked */
    for (let i = 0; i < this.renderedRows.length; i++) {
      let current: Element | null = target;

      while (current && current !== (this as unknown as Element)) {
        if (current === this.renderedRows[i]) {
          this.highlightedIndex = i;
          this.syncHighlight();

          /* Focus the tree for keyboard nav */
          const doc = this.ownerDocument as Document;
          doc.setActiveElement(this as unknown as Element);

          /* Toggle expand/collapse or select */
          const entry = this.visibleEntries[i];

          if (entry && entry.item.hasAttribute('expandable')) {
            if (entry.item.hasAttribute('open')) {
              entry.item.removeAttribute('open');
            } else {
              entry.item.setAttribute('open', '');
            }

            this.refresh();
          } else {
            this.dispatchEvent(new Event('select', {bubbles: true}));
          }

          return;
        }

        current = current.parentElement as Element | null;
      }
    }
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
