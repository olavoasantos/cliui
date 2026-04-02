import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../../../classes/Terminal';
import {Renderer} from '../../../renderer/classes/Renderer';
import {UiTbody} from '../../UiTbody/component';
import {UiTd} from '../../UiTd/component';
import {UiTfoot} from '../../UiTfoot/component';
import {UiTh} from '../../UiTh/component';
import {UiThead} from '../../UiThead/component';
import {UiTr} from '../../UiTr/component';
import {UiTable} from '../component';

import type {TerminalReadableInput} from '../../../terminal/types';

const COLS = 60;
const ROWS = 12;

function createOutput() {
  return {
    stream: {
      columns: COLS,
      rows: ROWS,
      write(_chunk: string) {
        return true;
      },
    },
  };
}

function createStdin(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
  } as unknown as TerminalReadableInput;
}

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

/** Extracts a row of text from the renderer's buffer. */
function readRow(renderer: Renderer, row: number): string {
  const buf = (
    renderer as unknown as {
      previousBuffer: {getRef(x: number, y: number): {char: string} | undefined};
    }
  ).previousBuffer;
  let text = '';

  for (let x = 0; x < COLS; x++) {
    const cell = buf.getRef(x, row);
    text += cell?.char ?? ' ';
  }

  return text;
}

/** Extracts multiple rows and trims trailing spaces per line. */
function readRows(renderer: Renderer, startRow: number, count: number): string[] {
  const rows: string[] = [];

  for (let y = startRow; y < startRow + count; y++) {
    rows.push(readRow(renderer, y).trimEnd());
  }

  return rows;
}

function createTerminal() {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  const output = createOutput();
  const terminal = new Terminal({
    altScreen: false,
    mouse: false,
    fps: 10,
    output: output.stream,
    input: createStdin(),
  });

  registerAll(terminal);

  return terminal;
}

function buildTable(
  doc: ReturnType<typeof createTerminal>['document'],
  headers: string[],
  rows: string[][],
) {
  const table = doc.createElement('ui-table') as UiTable;
  const thead = doc.createElement('ui-thead');
  const headerRow = doc.createElement('ui-tr');

  for (const h of headers) {
    const th = doc.createElement('ui-th');
    th.textContent = h;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = doc.createElement('ui-tbody');

  for (const row of rows) {
    const tr = doc.createElement('ui-tr');

    for (const cell of row) {
      const td = doc.createElement('ui-td');
      td.textContent = cell;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  return table;
}

describe('UiTable rendering', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Fixed — root cause was component stylesheets not loaded in tests.
  // Resolved by enabling `css: true` in vitest config so ?inline imports work.
  it('renders header and body text on the same row without truncation', async () => {
    const terminal = createTerminal();
    const doc = terminal.document;

    const table = buildTable(
      doc,
      ['Name', 'Role', 'Status'],
      [
        ['Alice', 'Engineer', 'Active'],
        ['Bob', 'Designer', 'Away'],
      ],
    );

    doc.body.appendChild(table);
    await terminal.run();

    const renderer = (terminal as unknown as {renderer: Renderer}).renderer;
    const lines = readRows(renderer, 0, ROWS);

    const headerLine = lines.find((l) => l.includes('Name') && l.includes('Role'));
    const aliceLine = lines.find((l) => l.includes('Alice') && l.includes('Engineer'));
    const bobLine = lines.find((l) => l.includes('Bob') && l.includes('Designer'));

    expect(headerLine).toBeDefined();
    expect(headerLine).toContain('Name');
    expect(headerLine).toContain('Role');
    expect(headerLine).toContain('Status');
    expect(aliceLine).toBeDefined();
    expect(aliceLine).toContain('Alice');
    expect(aliceLine).toContain('Engineer');
    expect(aliceLine).toContain('Active');
    expect(bobLine).toBeDefined();
    expect(bobLine).toContain('Bob');
    expect(bobLine).toContain('Designer');

    terminal.exit();
  });

  // Borders on inline cells in flex rows — fixed via content-box
  it('renders full cell text with borders and padding applied via CSS', async () => {
    const terminal = createTerminal();
    const doc = terminal.document;

    const style = doc.createElement('style');
    style.textContent = `
      ui-th { border-style: single; padding: 0 1; }
      ui-td { border-style: single; padding: 0 1; }
    `;
    doc.head.appendChild(style);

    const table = buildTable(doc, ['Name', 'Role'], [['Alice', 'Engineer']]);

    doc.body.appendChild(table);
    await terminal.run();

    const renderer = (terminal as unknown as {renderer: Renderer}).renderer;
    const lines = readRows(renderer, 0, ROWS);

    const aliceLine = lines.find((l) => l.includes('Alice') && l.includes('Engineer'));
    expect(aliceLine).toBeDefined();
    expect(aliceLine).toContain('Alice');
    expect(aliceLine).toContain('Engineer');

    const hasBorderChars = lines.some(
      (l) => l.includes('─') || l.includes('│') || l.includes('┌') || l.includes('└'),
    );
    expect(hasBorderChars).toBe(true);

    terminal.exit();
  });

  it('aligns columns so the same column starts at the same x across rows', async () => {
    const terminal = createTerminal();
    const doc = terminal.document;

    const table = buildTable(
      doc,
      ['Name', 'Role'],
      [
        ['Alice', 'Engineer'],
        ['Bob', 'Designer'],
      ],
    );

    doc.body.appendChild(table);
    await terminal.run();

    const renderer = (terminal as unknown as {renderer: Renderer}).renderer;
    const lines = readRows(renderer, 0, ROWS);

    const aliceLine = lines.find((l) => l.includes('Alice'))!;
    const bobLine = lines.find((l) => l.includes('Bob'))!;

    const engineerX = aliceLine.indexOf('Engineer');
    const designerX = bobLine.indexOf('Designer');

    expect(engineerX).toBeGreaterThan(0);
    expect(engineerX).toBe(designerX);

    terminal.exit();
  });
});
