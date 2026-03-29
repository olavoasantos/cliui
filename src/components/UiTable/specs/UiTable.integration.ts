import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../../../classes/Terminal';
import {UiTbody} from '../../UiTbody/component';
import {UiTd} from '../../UiTd/component';
import {UiTfoot} from '../../UiTfoot/component';
import {UiTh} from '../../UiTh/component';
import {UiThead} from '../../UiThead/component';
import {UiTr} from '../../UiTr/component';
import {UiTable} from '../component';

import type {TerminalReadableInput} from '../../../terminal/types';

function createOutput() {
  return {
    stream: {
      columns: 60,
      rows: 12,
      write(_chunk: string) {
        return true;
      },
    },
  };
}

function createStdin(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    off: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    resume: vi.fn(),
    pause: vi.fn(),
  } as unknown as TerminalReadableInput;
}

const stdin = createStdin();

function registerAll(terminal: Terminal): void {
  const ce = terminal.window.customElements;
  ce.define(UiTable.tagName, UiTable as unknown as CustomElementConstructor);
  ce.define(UiThead.tagName, UiThead as unknown as CustomElementConstructor);
  ce.define(UiTbody.tagName, UiTbody as unknown as CustomElementConstructor);
  ce.define(UiTfoot.tagName, UiTfoot as unknown as CustomElementConstructor);
  ce.define(UiTr.tagName, UiTr as unknown as CustomElementConstructor);
  ce.define(UiTh.tagName, UiTh as unknown as CustomElementConstructor);
  ce.define(UiTd.tagName, UiTd as unknown as CustomElementConstructor);
}

describe('UiTable integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a table with header and body rows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    registerAll(terminal);

    const doc = terminal.document;
    const table = doc.createElement('ui-table') as UiTable;

    const thead = doc.createElement('ui-thead');
    const headerRow = doc.createElement('ui-tr');
    const th1 = doc.createElement('ui-th');
    th1.textContent = 'Name';
    const th2 = doc.createElement('ui-th');
    th2.textContent = 'Role';
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    thead.appendChild(headerRow);

    const tbody = doc.createElement('ui-tbody');
    const bodyRow = doc.createElement('ui-tr');
    const td1 = doc.createElement('ui-td');
    td1.textContent = 'Alice';
    const td2 = doc.createElement('ui-td');
    td2.textContent = 'Engineer';
    bodyRow.appendChild(td1);
    bodyRow.appendChild(td2);
    tbody.appendChild(bodyRow);

    table.appendChild(thead);
    table.appendChild(tbody);
    doc.body.appendChild(table);

    await terminal.run();

    /* Verify column widths are aligned */
    expect(th1.style.getPropertyValue('width')).toBe(td1.style.getPropertyValue('width'));
    expect(th2.style.getPropertyValue('width')).toBe(td2.style.getPropertyValue('width'));

    /* Verify content is preserved */
    expect(th1.textContent).toBe('Name');
    expect(td2.textContent).toBe('Engineer');

    terminal.exit();
  });

  it('aligns columns with footer section', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    registerAll(terminal);

    const doc = terminal.document;
    const table = doc.createElement('ui-table') as UiTable;

    const tbody = doc.createElement('ui-tbody');
    const row1 = doc.createElement('ui-tr');
    const r1c1 = doc.createElement('ui-td');
    r1c1.textContent = 'A';
    const r1c2 = doc.createElement('ui-td');
    r1c2.textContent = 'B';
    row1.appendChild(r1c1);
    row1.appendChild(r1c2);
    tbody.appendChild(row1);

    const tfoot = doc.createElement('ui-tfoot');
    const footerRow = doc.createElement('ui-tr');
    const fc1 = doc.createElement('ui-td');
    fc1.textContent = 'Footer';
    const fc2 = doc.createElement('ui-td');
    fc2.textContent = 'Z';
    footerRow.appendChild(fc1);
    footerRow.appendChild(fc2);
    tfoot.appendChild(footerRow);

    table.appendChild(tbody);
    table.appendChild(tfoot);
    doc.body.appendChild(table);

    await terminal.run();

    /* "Footer" (6) is the widest in column 0 */
    expect(r1c1.style.getPropertyValue('width')).toBe('6');
    expect(fc1.style.getPropertyValue('width')).toBe('6');

    terminal.exit();
  });
});
