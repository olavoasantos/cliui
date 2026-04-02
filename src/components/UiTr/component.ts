import styles from './styles.css?inline';

import {UI_TR_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';
import type {Element} from '../../dom';

import type {UiTd} from '../UiTd/component';
import type {UiTh} from '../UiTh/component';

/**
 * Built-in table row element for use inside `<ui-thead>`, `<ui-tbody>`,
 * or `<ui-tfoot>`.
 *
 * Contains `<ui-th>` or `<ui-td>` children representing cells.
 *
 * Register with `window.customElements.define(UiTr.tagName, UiTr)`
 * before creating `<ui-tr>` elements in a window.
 */
export class UiTr extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = UI_TR_TAG_NAME;

  /** Returns all `<ui-th>` and `<ui-td>` children in order. */
  getCells(): Array<UiTh | UiTd> {
    const cells: Array<UiTh | UiTd> = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child) {
        const el = child as Element;

        if (el.localName === 'ui-th' || el.localName === 'ui-td') {
          cells.push(el as unknown as UiTh | UiTd);
        }
      }
    }

    return cells;
  }
}
