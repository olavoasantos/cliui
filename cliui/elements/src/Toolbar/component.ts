import styles from './styles.css?inline';

import {TOOLBAR_OBSERVED_ATTRIBUTES, TOOLBAR_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal toolbar custom element.
 *
 * Lays out child controls (buttons, selects, etc.) in a horizontal
 * flex row with gap spacing. Tab/Shift+Tab navigates between
 * focusable children.
 *
 * Register with `window.customElements.define(Toolbar.tagName, Toolbar)`
 * before creating `<toolbar>` elements in a window.
 */
export class Toolbar extends HTMLElement {
  static override readonly observedAttributes = TOOLBAR_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = TOOLBAR_TAG_NAME;
}
