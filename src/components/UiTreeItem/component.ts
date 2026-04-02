import styles from './styles.css?inline';

import {UI_TREE_ITEM_OBSERVED_ATTRIBUTES, UI_TREE_ITEM_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal tree item custom element.
 *
 * Represents a single node in a `<ui-tree>`. The `expandable`
 * attribute marks it as a branch node (toggleable). The `open`
 * attribute controls expanded/collapsed state. The parent tree
 * manages rendering — tree items are data containers, not
 * visual elements.
 *
 * Register with `window.customElements.define(UiTreeItem.tagName, UiTreeItem)`
 * before creating `<ui-tree-item>` elements in a window.
 */
export class UiTreeItem extends HTMLElement {
  static override readonly observedAttributes = UI_TREE_ITEM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TREE_ITEM_TAG_NAME;

  /** Returns the item's value attribute, falling back to text content. */
  getValue(): string {
    return this.getAttribute('value') ?? this.textContent ?? '';
  }
}
