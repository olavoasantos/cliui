import styles from './styles.css?inline';

import {TR_TAG_NAME} from './constants';
import {HTMLElement, type Element} from '@cliui/dom';

import type {Td} from '../Td/component';
import type {Th} from '../Th/component';

/**
 * Built-in table row element for use inside `<thead>`, `<tbody>`,
 * or `<tfoot>`.
 *
 * Contains `<th>` or `<td>` children representing cells.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('tr', Tr)`.
 */
export class Tr extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = TR_TAG_NAME;

  /** Returns all `<th>` and `<td>` children in order. */
  getCells(): Array<Th | Td> {
    const cells: Array<Th | Td> = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child) {
        const el = child as Element;

        if (el.localName === 'th' || el.localName === 'td') {
          cells.push(el as unknown as Th | Td);
        }
      }
    }

    return cells;
  }
}
