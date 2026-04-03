import styles from './styles.css?inline';

import {NAVMENU_ITEM_OBSERVED_ATTRIBUTES, NAVMENU_ITEM_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal menu item custom element.
 *
 * Represents a single selectable item within a `<navmenu>`. The
 * `highlighted` attribute indicates the currently focused item.
 * Navigation and selection are handled by the parent `<navmenu>`.
 *
 * Register with `window.customElements.define(NavmenuItem.tagName, NavmenuItem)`
 * before creating `<navmenuitem>` elements in a window.
 */
export class NavmenuItem extends HTMLElement {
  static override readonly observedAttributes = NAVMENU_ITEM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = NAVMENU_ITEM_TAG_NAME;

  /** Whether this item is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
