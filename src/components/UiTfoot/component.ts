import styles from './styles.css?inline';

import {UI_TFOOT_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';
import type {Element} from '../../dom';

import type {UiTr} from '../UiTr/component';

/**
 * Built-in table foot group element for use inside `<ui-table>`.
 *
 * Contains `<ui-tr>` children representing footer rows.
 *
 * Register with `window.customElements.define(UiTfoot.tagName, UiTfoot)`
 * before creating `<ui-tfoot>` elements in a window.
 */
export class UiTfoot extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = UI_TFOOT_TAG_NAME;

  /** Returns all `<ui-tr>` children in order. */
  getRows(): UiTr[] {
    const rows: UiTr[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'ui-tr') {
        rows.push(child as unknown as UiTr);
      }
    }

    return rows;
  }
}
