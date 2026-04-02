import styles from './styles.css?inline';

import {UI_MENU_ITEM_OBSERVED_ATTRIBUTES, UI_MENU_ITEM_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal menu item custom element.
 *
 * Represents a single selectable item within a `<ui-menu>`. The
 * `highlighted` attribute indicates the currently focused item.
 * Navigation and selection are handled by the parent `<ui-menu>`.
 *
 * Register with `window.customElements.define(UiMenuItem.tagName, UiMenuItem)`
 * before creating `<ui-menu-item>` elements in a window.
 */
export class UiMenuItem extends HTMLElement {
  static override readonly observedAttributes = UI_MENU_ITEM_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_MENU_ITEM_TAG_NAME;

  /** Whether this item is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
