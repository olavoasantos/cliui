import styles from './styles.css?inline';

import {UI_STATUSLINE_OBSERVED_ATTRIBUTES, UI_STATUSLINE_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal status bar custom element.
 *
 * Positions itself at the bottom of the viewport using absolute
 * positioning and full width. Children are laid out in a flex row.
 * Use `flex-grow: 1` on a child to fill remaining space, or
 * `margin-left: auto` to push segments to the right.
 *
 * Register with `window.customElements.define(UiStatusline.tagName, UiStatusline)`
 * before creating `<ui-statusline>` elements in a window.
 */
export class UiStatusline extends HTMLElement {
  static override readonly observedAttributes = UI_STATUSLINE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_STATUSLINE_TAG_NAME;
}
