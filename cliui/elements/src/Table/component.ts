import styles from './styles.css?inline';

import {DEFAULT_TABLE_COLUMN_GAP, TABLE_OBSERVED_ATTRIBUTES, TABLE_TAG_NAME} from './constants';
import {HTMLElement, type Element} from '@cliui/dom';
import {cellWidth} from '@cliui/terminal';

import type {Tbody} from '../Tbody/component';
import type {Tfoot} from '../Tfoot/component';
import type {Thead} from '../Thead/component';
import type {Tr} from '../Tr/component';

/**
 * Built-in terminal table custom element for structured tabular data.
 *
 * Uses HTML-inspired child elements for structure:
 * - `<thead>` — header group containing `<tr>` rows
 * - `<tbody>` — body group containing `<tr>` rows
 * - `<tfoot>` — footer group containing `<tr>` rows
 * - `<tr>` — row containing `<th>` or `<td>` cells
 *
 * On connect, the table scans all rows, computes the maximum cell
 * width per column across every row, and applies a fixed width to
 * each cell for consistent column alignment. Rows are rendered as
 * `flex-direction: row` containers with configurable column gap.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('table', Table)`.
 */
export class Table extends HTMLElement {
  static override readonly observedAttributes = TABLE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = TABLE_TAG_NAME;

  connectedCallback(): void {
    this.alignColumns();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'column-gap') {
      this.alignColumns();
    }
  }

  /**
   * Returns the configured column gap, falling back to the default.
   */
  getColumnGap(): number {
    const raw = this.getAttribute('column-gap');

    if (raw != null) {
      const parsed = Number.parseInt(raw, 10);

      if (!Number.isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return DEFAULT_TABLE_COLUMN_GAP;
  }

  /**
   * Re-computes column widths and applies them to all cells.
   *
   * Call this after programmatically changing cell content to
   * re-align the table.
   */
  alignColumns(): void {
    const allRows = this.collectAllRows();

    if (allRows.length === 0) return;

    const columnWidths = this.computeColumnWidths(allRows);
    const gap = this.getColumnGap();

    this.applyColumnWidths(allRows, columnWidths, gap);
  }

  /* ── Private: Row collection ────────────────────────────── */

  private collectAllRows(): Tr[] {
    const rows: Tr[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (!child || !('localName' in child)) continue;

      const el = child as Element;

      if (el.localName === 'tr') {
        rows.push(el as unknown as Tr);
      } else if (el.localName === 'thead' || el.localName === 'tbody' || el.localName === 'tfoot') {
        const section = el as unknown as Thead | Tbody | Tfoot;
        const sectionRows = section.getRows();

        for (const row of sectionRows) {
          rows.push(row);
        }
      }
    }

    return rows;
  }

  /* ── Private: Column width computation ──────────────────── */

  private computeColumnWidths(rows: Tr[]): number[] {
    const widths: number[] = [];

    for (const row of rows) {
      const cells = row.getCells();

      for (let col = 0; col < cells.length; col++) {
        const cell = cells[col]!;
        const text = cell.textContent ?? '';
        const width = cellWidth(text);

        if (col >= widths.length) {
          widths.push(width);
        } else if (width > widths[col]!) {
          widths[col] = width;
        }
      }
    }

    return widths;
  }

  private applyColumnWidths(rows: Tr[], columnWidths: number[], gap: number): void {
    for (const row of rows) {
      row.style.gap = String(gap);

      const cells = row.getCells();

      for (let col = 0; col < cells.length; col++) {
        const cell = cells[col]!;
        const width = col < columnWidths.length ? columnWidths[col]! : 0;

        cell.style.width = String(width);
      }
    }
  }
}
