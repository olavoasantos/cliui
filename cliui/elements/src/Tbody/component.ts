import styles from './styles.css?inline';

import {TBODY_TAG_NAME} from './constants';
import {HTMLElement, type Element} from '@cliui/dom';

import type {Tr} from '../Tr/component';

/**
 * Built-in table tbody group element for use inside `<table>`.
 *
 * Contains `<tr>` children representing tbody rows.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('tbody', Tbody)`.
 */
export class Tbody extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = TBODY_TAG_NAME;

  /** Returns all `<tr>` children in order. */
  getRows(): Tr[] {
    const rows: Tr[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'tr') {
        rows.push(child as unknown as Tr);
      }
    }

    return rows;
  }
}
