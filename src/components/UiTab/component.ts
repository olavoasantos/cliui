import styles from './styles.css?inline';

import {UI_TAB_OBSERVED_ATTRIBUTES, UI_TAB_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal tab header custom element.
 *
 * Represents a single tab within a `<ui-tabs>` container. The `selected`
 * attribute indicates the active tab. Tabs are non-focusable individually —
 * keyboard navigation is handled by the parent `<ui-tabs>`.
 *
 * Register with `window.customElements.define(UiTab.tagName, UiTab)`
 * before creating `<ui-tab>` elements in a window.
 */
export class UiTab extends HTMLElement {
  static override readonly observedAttributes = UI_TAB_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TAB_TAG_NAME;

  /** Whether this tab is currently selected. */
  isSelected(): boolean {
    return this.hasAttribute('selected');
  }

  /** Whether this tab is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
