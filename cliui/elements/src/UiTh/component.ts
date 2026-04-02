import styles from './styles.css?inline';

import {UI_TH_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in table header cell element for use inside `<ui-tr>`.
 *
 * Renders with bold text by default. The parent `<ui-table>` manages
 * column width alignment by setting an explicit `width` style on each
 * cell during layout.
 *
 * Register with `window.customElements.define(UiTh.tagName, UiTh)`
 * before creating `<ui-th>` elements in a window.
 */
export class UiTh extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = UI_TH_TAG_NAME;
}
