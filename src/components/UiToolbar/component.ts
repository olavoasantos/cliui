import styles from './styles.css?inline';

import {UI_TOOLBAR_OBSERVED_ATTRIBUTES, UI_TOOLBAR_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal toolbar custom element.
 *
 * Lays out child controls (buttons, selects, etc.) in a horizontal
 * flex row with gap spacing. Tab/Shift+Tab navigates between
 * focusable children.
 *
 * Register with `window.customElements.define(UiToolbar.tagName, UiToolbar)`
 * before creating `<ui-toolbar>` elements in a window.
 */
export class UiToolbar extends HTMLElement {
  static override readonly observedAttributes = UI_TOOLBAR_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TOOLBAR_TAG_NAME;
}
