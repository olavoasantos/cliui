import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Tbody} from '../../Tbody/component';
import {Td} from '../../Td/component';
import {Tfoot} from '../../Tfoot/component';
import {Th} from '../../Th/component';
import {Thead} from '../../Thead/component';
import {Tr} from '../../Tr/component';
import {Table} from '../component';

import type {Element} from '@cliui/dom';
import type {Document} from '@cliui/dom';

function registerAll(window: Window): void {
  window.customElements.define(Table.tagName, Table as unknown as CustomElementConstructor);
  window.customElements.define(Thead.tagName, Thead as unknown as CustomElementConstructor);
  window.customElements.define(Tbody.tagName, Tbody as unknown as CustomElementConstructor);
  window.customElements.define(Tfoot.tagName, Tfoot as unknown as CustomElementConstructor);
  window.customElements.define(Tr.tagName, Tr as unknown as CustomElementConstructor);
  window.customElements.define(Th.tagName, Th as unknown as CustomElementConstructor);
  window.customElements.define(Td.tagName, Td as unknown as CustomElementConstructor);
}

function createCell(doc: Document, tag: 'th' | 'td', text: string): Element {
  const cell = doc.createElement(tag);
  cell.textContent = text;
  return cell;
}

function createRow(doc: Document, cells: Array<{tag: 'th' | 'td'; text: string}>): Element {
  const row = doc.createElement('tr');

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
): {window: Window; table: Table} {
  const window = new Window();

  registerAll(window);

  const doc = window.document;
  const table = doc.createElement('table') as Table;

  if (options.columnGap != null) {
    table.setAttribute('column-gap', options.columnGap);
  }

  if (options.bareRows) {
    for (const rowData of options.rows ?? []) {
      const row = createRow(
        doc,
        rowData.map((text) => ({tag: 'td' as const, text})),
      );
      table.appendChild(row);
    }
  } else {
    if (options.headers) {
      const thead = doc.createElement('thead');

      for (const rowData of options.headers) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'th' as const, text})),
        );
        thead.appendChild(row);
      }

      table.appendChild(thead);
    }

    if (options.rows) {
      const tbody = doc.createElement('tbody');

      for (const rowData of options.rows) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'td' as const, text})),
        );
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
    }

    if (options.footers) {
      const tfoot = doc.createElement('tfoot');

      for (const rowData of options.footers) {
        const row = createRow(
          doc,
          rowData.map((text) => ({tag: 'td' as const, text})),
        );
        tfoot.appendChild(row);
      }

      table.appendChild(tfoot);
    }
  }

  doc.body.appendChild(table);

  return {window, table};
}

function getCellWidths(table: Table): number[][] {
  const widths: number[][] = [];

  function scanChildren(parent: Element): void {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (!child || !('localName' in child)) continue;
      const el = child as Element;

      if (el.localName === 'tr') {
        const rowWidths: number[] = [];

        for (let j = 0; j < el.childNodes.length; j++) {
          const cell = el.childNodes[j];
          if (!cell || !('localName' in cell)) continue;
          const cellEl = cell as Element;

          if (cellEl.localName === 'th' || cellEl.localName === 'td') {
            const w = cellEl.style.getPropertyValue('width');
            rowWidths.push(w ? Number.parseInt(w, 10) : 0);
          }
        }

        widths.push(rowWidths);
      } else if (el.localName === 'thead' || el.localName === 'tbody' || el.localName === 'tfoot') {
        scanChildren(el);
      }
    }
  }

  scanChildren(table as unknown as Element);
  return widths;
}

function getRowGaps(table: Table): string[] {
  const gaps: string[] = [];

  function scanChildren(parent: Element): void {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (!child || !('localName' in child)) continue;
      const el = child as Element;

      if (el.localName === 'tr') {
        gaps.push(el.style.getPropertyValue('column-gap'));
      } else if (el.localName === 'thead' || el.localName === 'tbody' || el.localName === 'tfoot') {
        scanChildren(el);
      }
    }
  }

  scanChildren(table as unknown as Element);
  return gaps;
}

describe('Table', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Table.tagName, Table as unknown as CustomElementConstructor);

    expect(window.customElements.get('table')).toBe(Table as unknown as CustomElementConstructor);
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

      expect(widths[0]).toEqual([5, 5]);
      expect(widths[1]).toEqual([5, 5]);
    });

    it('handles empty table gracefully', () => {
      const {table} = createTable();

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
