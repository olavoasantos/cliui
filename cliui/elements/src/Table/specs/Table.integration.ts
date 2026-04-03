import type {CustomElementConstructor} from '@cliui/dom';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {Tbody} from '../../Tbody/component';
import {Td} from '../../Td/component';
import {Tfoot} from '../../Tfoot/component';
import {Th} from '../../Th/component';
import {Thead} from '../../Thead/component';
import {Tr} from '../../Tr/component';
import {Table} from '../component';

import type {TerminalReadableInput} from '@cliui/terminal';

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
  ce.define(Table.tagName, Table as unknown as CustomElementConstructor);
  ce.define(Thead.tagName, Thead as unknown as CustomElementConstructor);
  ce.define(Tbody.tagName, Tbody as unknown as CustomElementConstructor);
  ce.define(Tfoot.tagName, Tfoot as unknown as CustomElementConstructor);
  ce.define(Tr.tagName, Tr as unknown as CustomElementConstructor);
  ce.define(Th.tagName, Th as unknown as CustomElementConstructor);
  ce.define(Td.tagName, Td as unknown as CustomElementConstructor);
}

describe('Table integration', () => {
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
    const table = doc.createElement('table') as Table;

    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');
    const th1 = doc.createElement('th');
    th1.textContent = 'Name';
    const th2 = doc.createElement('th');
    th2.textContent = 'Role';
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    thead.appendChild(headerRow);

    const tbody = doc.createElement('tbody');
    const bodyRow = doc.createElement('tr');
    const td1 = doc.createElement('td');
    td1.textContent = 'Alice';
    const td2 = doc.createElement('td');
    td2.textContent = 'Engineer';
    bodyRow.appendChild(td1);
    bodyRow.appendChild(td2);
    tbody.appendChild(bodyRow);

    table.appendChild(thead);
    table.appendChild(tbody);
    doc.body.appendChild(table);

    await terminal.run();

    expect(th1.style.getPropertyValue('width')).toBe(td1.style.getPropertyValue('width'));
    expect(th2.style.getPropertyValue('width')).toBe(td2.style.getPropertyValue('width'));

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
    const table = doc.createElement('table') as Table;

    const tbody = doc.createElement('tbody');
    const row1 = doc.createElement('tr');
    const r1c1 = doc.createElement('td');
    r1c1.textContent = 'A';
    const r1c2 = doc.createElement('td');
    r1c2.textContent = 'B';
    row1.appendChild(r1c1);
    row1.appendChild(r1c2);
    tbody.appendChild(row1);

    const tfoot = doc.createElement('tfoot');
    const footerRow = doc.createElement('tr');
    const fc1 = doc.createElement('td');
    fc1.textContent = 'Footer';
    const fc2 = doc.createElement('td');
    fc2.textContent = 'Z';
    footerRow.appendChild(fc1);
    footerRow.appendChild(fc2);
    tfoot.appendChild(footerRow);

    table.appendChild(tbody);
    table.appendChild(tfoot);
    doc.body.appendChild(table);

    await terminal.run();

    expect(r1c1.style.getPropertyValue('width')).toBe('6');
    expect(fc1.style.getPropertyValue('width')).toBe('6');

    terminal.exit();
  });
});
