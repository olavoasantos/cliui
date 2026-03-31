import styles from './styles.css?inline';

import {UI_TREE_ITEM_OBSERVED_ATTRIBUTES, UI_TREE_ITEM_TAG_NAME} from './constants';
import {
  UI_TREE_INDENT_SIZE,
  UI_TREE_INDICATOR_COLLAPSED,
  UI_TREE_INDICATOR_EXPANDED,
  UI_TREE_INDICATOR_LEAF,
} from '../UiTree/constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal tree item custom element.
 *
 * Represents a single node in a `<ui-tree>`. The `expandable`
 * attribute marks it as a branch node (toggleable). The `open`
 * attribute controls expanded/collapsed state. Indentation is
 * set automatically by the parent tree based on nesting depth.
 *
 * Register with `window.customElements.define(UiTreeItem.tagName, UiTreeItem)`
 * before creating `<ui-tree-item>` elements in a window.
 */
export class UiTreeItem extends HTMLElement {
  static override readonly observedAttributes = UI_TREE_ITEM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TREE_ITEM_TAG_NAME;

  /** Sets the indentation depth (called by the parent tree). */
  setDepth(depth: number): void {
    this.style.paddingLeft = String(depth * UI_TREE_INDENT_SIZE);

    /* Update the indicator prefix */
    const indicator = this.hasAttribute('expandable')
      ? this.hasAttribute('open')
        ? UI_TREE_INDICATOR_EXPANDED
        : UI_TREE_INDICATOR_COLLAPSED
      : UI_TREE_INDICATOR_LEAF;

    /* Ensure the indicator span exists */
    let indicatorEl = this.querySelector('.ui-tree-indicator');

    if (!indicatorEl) {
      const doc = this.ownerDocument!;
      indicatorEl = doc.createElement('span');
      indicatorEl.setAttribute('class', 'ui-tree-indicator');
      indicatorEl.style.display = 'inline';
      indicatorEl.style.whiteSpace = 'pre';

      if (this.childNodes.length > 0) {
        this.insertBefore(indicatorEl as unknown as import('../../dom').Node, this.childNodes[0]!);
      } else {
        this.appendChild(indicatorEl as unknown as import('../../dom').Node);
      }
    }

    indicatorEl.textContent = `${indicator} `;
  }

  /** Returns the item's value attribute. */
  getValue(): string {
    return this.getAttribute('value') ?? this.textContent ?? '';
  }
}
