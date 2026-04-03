import styles from './styles.css?inline';

import {TREE_ITEM_OBSERVED_ATTRIBUTES, TREE_ITEM_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal tree item custom element.
 *
 * Represents a single node in a `<tree>`. The `expandable`
 * attribute marks it as a branch node (toggleable). The `open`
 * attribute controls expanded/collapsed state. The parent tree
 * manages rendering — tree items are data containers, not
 * visual elements.
 *
 * Register with `window.customElements.define(TreeItem.tagName, TreeItem)`
 * before creating `<treeitem>` elements in a window.
 */
export class TreeItem extends HTMLElement {
  static override readonly observedAttributes = TREE_ITEM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = TREE_ITEM_TAG_NAME;

  /** Returns the item's value attribute, falling back to text content. */
  getValue(): string {
    return this.getAttribute('value') ?? this.textContent ?? '';
  }
}
