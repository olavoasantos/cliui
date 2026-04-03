import styles from './styles.css?inline';

import {STATUSLINE_OBSERVED_ATTRIBUTES, STATUSLINE_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal status bar custom element.
 *
 * Positions itself at the bottom of the viewport using absolute
 * positioning and full width. Children are laid out in a flex row.
 * Use `flex-grow: 1` on a child to fill remaining space, or
 * `margin-left: auto` to push segments to the right.
 *
 * Register with `window.customElements.define(Statusline.tagName, Statusline)`
 * before creating `<statusline>` elements in a window.
 */
export class Statusline extends HTMLElement {
  static override readonly observedAttributes = STATUSLINE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = STATUSLINE_TAG_NAME;
}
