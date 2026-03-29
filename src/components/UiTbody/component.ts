import styles from './styles.css?inline';

import {UI_TBODY_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

import type {UiTr} from '../UiTr/component';

/**
 * Built-in table body group element for use inside `<ui-table>`.
 *
 * Contains `<ui-tr>` children representing body rows.
 *
 * Register with `window.customElements.define(UiTbody.tagName, UiTbody)`
 * before creating `<ui-tbody>` elements in a window.
 */
export class UiTbody extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = UI_TBODY_TAG_NAME;

  /** Returns all `<ui-tr>` children in order. */
  getRows(): UiTr[] {
    const rows: UiTr[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (
        child &&
        'localName' in child &&
        (child as import('../../dom').Element).localName === 'ui-tr'
      ) {
        rows.push(child as unknown as UiTr);
      }
    }

    return rows;
  }
}
