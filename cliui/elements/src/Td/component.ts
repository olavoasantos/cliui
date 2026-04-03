import styles from './styles.css?inline';

import {TD_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in table data cell element for use inside `<tr>`.
 *
 * Represents a single data cell in a table row. The parent `<table>`
 * manages column width alignment by setting an explicit `width` style
 * on each cell during layout.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('td', Td)`.
 */
export class Td extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = TD_TAG_NAME;
}
