import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {UiTbody} from '../../UiTbody/component';
import {UiTd} from '../../UiTd/component';
import {UiTfoot} from '../../UiTfoot/component';
import {UiTh} from '../../UiTh/component';
import {UiThead} from '../../UiThead/component';
import {UiTr} from '../../UiTr/component';
import {UiTable} from '../component';

import type {Element} from '@cliui/dom';
import type {Document} from '@cliui/dom';

function registerAll(window: Window): void {
  window.customElements.define(UiTable.tagName, UiTable as unknown as CustomElementConstructor);
  window.customElements.define(UiThead.tagName, UiThead as unknown as CustomElementConstructor);
  window.customElements.define(UiTbody.tagName, UiTbody as unknown as CustomElementConstructor);
  window.customElements.define(UiTfoot.tagName, UiTfoot as unknown as CustomElementConstructor);
  window.customElements.define(UiTr.tagName, UiTr as unknown as CustomElementConstructor);
  window.customElements.define(UiTh.tagName, UiTh as unknown as CustomElementConstructor);
  window.customElements.define(UiTd.tagName, UiTd as unknown as CustomElementConstructor);
}

function createCell(doc: Document, tag: 'ui-th' | 'ui-td', text: string): Element {
  const cell = doc.createElement(tag);
  cell.textContent = text;
  return cell;
}

function createRow(doc: Document, cells: Array<{tag: 'ui-th' | 'ui-td'; text: string}>): Element {
  const row = doc.createElement('ui-tr');

  for (const cell of cells) {
    row.appendChild(createCell(doc, cell.tag, cell.text));
  }

  return row;
}

function createTable(
  options: {
    headers?: string[][];
    rows?: string[][];
    footers?: string[][];
    columnGap?: string;
    bareRows?: boolean;
  } = {},
): {window: Window; table: UiTable} {
  const window = new Window();

  registerAll(window);

  const doc = window.document;
  const table = doc.createElement('ui-table') as UiTable;

  if (options.columnGap != null) {
    table.setAttribute('column-gap', options.columnGap);
  }

  if (options.bareRows) {
    /* Rows directly under ui-table, no thead/tbody */
    for (const rowData of options.rows ?? []) {
      const row = createRow(
        doc,
        rowData.map((text) => ({tag: 'ui-td' as const, text})),
      );
      table.appendChild(row);
    }
  } else {
    if (options.headers) {
      const thead = doc.createElement('ui-thead');

      for (const rowData of options.headers) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'ui-th' as const, text})),
        );
        thead.appendChild(row);
      }

      table.appendChild(thead);
    }

    if (options.rows) {
      const tbody = doc.createElement('ui-tbody');

      for (const rowData of options.rows) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'ui-td' as const, text})),
        );
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
    }

    if (options.footers) {
      const tfoot = doc.createElement('ui-tfoot');

      for (const rowData of options.footers) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'ui-td' as const, text})),
        );
        tfoot.appendChild(row);
      }

      table.appendChild(tfoot);
    }
  }

  doc.body.appendChild(table);

  return {window, table};
}

function getCellWidths(table: UiTable): number[][] {
  const widths: number[][] = [];

  function scanChildren(parent: Element): void {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (!child || !('localName' in child)) continue;
      const el = child as Element;

      if (el.localName === 'ui-tr') {
        const rowWidths: number[] = [];

        for (let j = 0; j < el.childNodes.length; j++) {
          const cell = el.childNodes[j];
          if (!cell || !('localName' in cell)) continue;
          const cellEl = cell as Element;

          if (cellEl.localName === 'ui-th' || cellEl.localName === 'ui-td') {
            const w = cellEl.style.getPropertyValue('width');
            rowWidths.push(w ? Number.parseInt(w, 10) : 0);
          }
        }

        widths.push(rowWidths);
      } else if (
        el.localName === 'ui-thead' ||
        el.localName === 'ui-tbody' ||
        el.localName === 'ui-tfoot'
      ) {
        scanChildren(el);
      }
    }
  }

  scanChildren(table as unknown as Element);
  return widths;
}

function getRowGaps(table: UiTable): string[] {
  const gaps: string[] = [];

  function scanChildren(parent: Element): void {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (!child || !('localName' in child)) continue;
      const el = child as Element;

      if (el.localName === 'ui-tr') {
        gaps.push(el.style.getPropertyValue('column-gap'));
      } else if (
        el.localName === 'ui-thead' ||
        el.localName === 'ui-tbody' ||
        el.localName === 'ui-tfoot'
      ) {
        scanChildren(el);
      }
    }
  }

  scanChildren(table as unknown as Element);
  return gaps;
}

describe('UiTable', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiTable.tagName, UiTable as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-table')).toBe(
      UiTable as unknown as CustomElementConstructor,
    );
  });

  describe('column alignment', () => {
    it('computes max width per column from header and body', () => {
      const {table} = createTable({
        headers: [['Name', 'Role']],
        rows: [
          ['Alice', 'Engineer'],
          ['Bob', 'Designer'],
        ],
      });

      const widths = getCellWidths(table);

      /* Column 0: max("Name"=4, "Alice"=5, "Bob"=3) = 5 */
      /* Column 1: max("Role"=4, "Engineer"=8, "Designer"=8) = 8 */
      expect(widths[0]).toEqual([5, 8]);
      expect(widths[1]).toEqual([5, 8]);
      expect(widths[2]).toEqual([5, 8]);
    });

    it('handles rows with different column counts', () => {
      const {table} = createTable({
        rows: [
          ['A', 'B', 'C'],
          ['D', 'E'],
        ],
      });

      const widths = getCellWidths(table);

      /* Row 0 has 3 cells, row 1 has 2 cells */
      expect(widths[0]).toEqual([1, 1, 1]);
      expect(widths[1]).toEqual([1, 1]);
    });

    it('handles single column', () => {
      const {table} = createTable({
        rows: [['Short'], ['A longer value']],
      });

      const widths = getCellWidths(table);

      expect(widths[0]).toEqual([14]);
      expect(widths[1]).toEqual([14]);
    });

    it('includes footer rows in width computation', () => {
      const {table} = createTable({
        headers: [['X', 'Y']],
        rows: [['AB', 'CD']],
        footers: [['Total', 'Sum']],
      });

      const widths = getCellWidths(table);

      /* Column 0: max("X"=1, "AB"=2, "Total"=5) = 5 */
      /* Column 1: max("Y"=1, "CD"=2, "Sum"=3) = 3 */
      expect(widths[0]).toEqual([5, 3]);
      expect(widths[1]).toEqual([5, 3]);
      expect(widths[2]).toEqual([5, 3]);
    });

    it('handles bare rows without thead/tbody', () => {
      const {table} = createTable({
        bareRows: true,
        rows: [
          ['Alpha', 'B'],
          ['C', 'Delta'],
        ],
      });

      const widths = getCellWidths(table);

      /* Column 0: max("Alpha"=5, "C"=1) = 5 */
      /* Column 1: max("B"=1, "Delta"=5) = 5 */
      expect(widths[0]).toEqual([5, 5]);
      expect(widths[1]).toEqual([5, 5]);
    });

    it('handles empty table gracefully', () => {
      const {table} = createTable();

      /* Should not throw */
      expect(getCellWidths(table)).toEqual([]);
    });
  });

  describe('column gap', () => {
    it('applies default column gap to rows', () => {
      const {table} = createTable({
        rows: [['A', 'B']],
      });

      const gaps = getRowGaps(table);

      expect(gaps[0]).toBe('2');
    });

    it('applies custom column gap from attribute', () => {
      const {table} = createTable({
        rows: [['A', 'B']],
        columnGap: '4',
      });

      const gaps = getRowGaps(table);

      expect(gaps[0]).toBe('4');
    });

    it('uses default gap for invalid attribute value', () => {
      const {table} = createTable({
        rows: [['A', 'B']],
        columnGap: 'abc',
      });

      expect(table.getColumnGap()).toBe(2);
    });

    it('re-aligns when column-gap attribute changes', () => {
      const {table} = createTable({
        rows: [['A', 'B']],
      });

      expect(getRowGaps(table)[0]).toBe('2');

      table.setAttribute('column-gap', '5');

      expect(getRowGaps(table)[0]).toBe('5');
    });
  });

  describe('alignColumns', () => {
    it('can be called manually to re-align after content changes', () => {
      const {table} = createTable({
        rows: [
          ['A', 'B'],
          ['C', 'D'],
        ],
      });

      let widths = getCellWidths(table);
      expect(widths[0]).toEqual([1, 1]);

      /* Programmatically change a cell's text */
      const tbody = table.childNodes[0] as Element;
      const firstRow = tbody.childNodes[0] as Element;
      const firstCell = firstRow.childNodes[0] as Element;
      firstCell.textContent = 'LongerText';

      table.alignColumns();

      widths = getCellWidths(table);
      expect(widths[0]![0]).toBe(10);
      expect(widths[1]![0]).toBe(10);
    });
  });
});
