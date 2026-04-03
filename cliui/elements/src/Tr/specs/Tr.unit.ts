import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Td} from '../../Td/component';
import {Th} from '../../Th/component';
import {Tr} from '../component';

function createRow(
  window = new Window(),
  cells: Array<{type: 'th' | 'td'; text: string}> = [],
): {window: Window; row: Tr} {
  window.customElements.define(Tr.tagName, Tr as unknown as CustomElementConstructor);
  window.customElements.define(Td.tagName, Td as unknown as CustomElementConstructor);
  window.customElements.define(Th.tagName, Th as unknown as CustomElementConstructor);

  const row = window.document.createElement('tr') as Tr;

  for (const cell of cells) {
    const el = window.document.createElement(cell.type === 'th' ? 'th' : 'td');
    el.textContent = cell.text;
    row.appendChild(el);
  }

  window.document.body.appendChild(row);

  return {window, row};
}

describe('Tr', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Tr.tagName, Tr as unknown as CustomElementConstructor);

    expect(window.customElements.get('tr')).toBe(Tr as unknown as CustomElementConstructor);
  });

  it('returns empty array when no cells', () => {
    const {row} = createRow();

    expect(row.getCells()).toHaveLength(0);
  });

  it('returns td cells', () => {
    const {row} = createRow(undefined, [
      {type: 'td', text: 'A'},
      {type: 'td', text: 'B'},
    ]);

    const cells = row.getCells();

    expect(cells).toHaveLength(2);
    expect(cells[0]!.textContent).toBe('A');
    expect(cells[1]!.textContent).toBe('B');
  });

  it('returns th cells', () => {
    const {row} = createRow(undefined, [{type: 'th', text: 'Name'}]);

    const cells = row.getCells();

    expect(cells).toHaveLength(1);
    expect(cells[0]!.textContent).toBe('Name');
  });

  it('returns mixed th and td cells in order', () => {
    const {row} = createRow(undefined, [
      {type: 'th', text: 'H1'},
      {type: 'td', text: 'D1'},
    ]);

    const cells = row.getCells();

    expect(cells).toHaveLength(2);
    expect(cells[0]!.textContent).toBe('H1');
    expect(cells[1]!.textContent).toBe('D1');
  });

  it('ignores non-cell children', () => {
    const {window, row} = createRow();
    const div = window.document.createElement('div');
    div.textContent = 'Not a cell';
    row.appendChild(div);

    expect(row.getCells()).toHaveLength(0);
  });
});
