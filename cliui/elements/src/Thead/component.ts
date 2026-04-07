import styles from './styles.css?inline';

import {THEAD_TAG_NAME} from './constants';
import {HTMLElement, type Element} from '@cliui/dom';

import type {Tr} from '../Tr/component';

/**
 * Built-in table thead group element for use inside `<table>`.
 *
 * Contains `<tr>` children representing thead rows.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('thead', Thead)`.
 */
export class Thead extends HTMLElement {
  static readonly styles = styles;
  static readonly tagName = THEAD_TAG_NAME;

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
