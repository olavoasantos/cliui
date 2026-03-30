import styles from './styles.css?inline';

import {UI_TAB_PANEL_OBSERVED_ATTRIBUTES, UI_TAB_PANEL_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal tab content panel custom element.
 *
 * Displays the content for a single tab. Only the panel corresponding
 * to the active tab is visible; inactive panels have `hidden` set by
 * the parent `<ui-tabs>`.
 *
 * Register with `window.customElements.define(UiTabPanel.tagName, UiTabPanel)`
 * before creating `<ui-tab-panel>` elements in a window.
 */
export class UiTabPanel extends HTMLElement {
  static override readonly observedAttributes = UI_TAB_PANEL_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TAB_PANEL_TAG_NAME;
}
