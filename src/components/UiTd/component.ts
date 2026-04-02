import styles from './styles.css?inline';

import {UI_TD_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in table data cell element for use inside `<ui-tr>`.
 *
 * Represents a single data cell in a table row. The parent `<ui-table>`
 * manages column width alignment by setting an explicit `width` style
 * on each cell during layout.
 *
 * Register with `window.customElements.define(UiTd.tagName, UiTd)`
 * before creating `<ui-td>` elements in a window.
 */
export class UiTd extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = UI_TD_TAG_NAME;
}
