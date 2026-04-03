import styles from './styles.css?inline';

import {TH_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in table header cell element for use inside `<tr>`.
 *
 * Renders with bold text by default. The parent `<table>` manages
 * column width alignment by setting an explicit `width` style on each
 * cell during layout.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('th', Th)`.
 */
export class Th extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = TH_TAG_NAME;
}
