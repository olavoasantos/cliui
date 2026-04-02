import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../../../classes/Terminal';
import {Renderer} from '../../../renderer/classes/Renderer';
import {UiTree} from '../component';
import {UiTreeItem} from '../../UiTreeItem/component';

import type {TerminalReadableInput} from '../../../terminal/types';

const COLS = 60;
const ROWS = 20;

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

function readRows(renderer: Renderer, startRow: number, count: number): string[] {
  const rows: string[] = [];

  for (let y = startRow; y < startRow + count; y++) {
    rows.push(readRow(renderer, y).trimEnd());
  }

  return rows;
}

describe('UiTree integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders tree items with full text visible', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: createOutput().stream,
      input: createStdin(),
    });

    terminal.window.customElements.define(UiTree.tagName, UiTree);
    terminal.window.customElements.define(UiTreeItem.tagName, UiTreeItem);

    const doc = terminal.document;
    const tree = doc.createElement('ui-tree') as UiTree;
    tree.setAttribute('tabindex', '0');

    const item1 = doc.createElement('ui-tree-item');
    item1.setAttribute('value', 'Alpha');
    item1.textContent = 'Alpha';

    const item2 = doc.createElement('ui-tree-item');
    item2.setAttribute('value', 'Bravo');
    item2.textContent = 'Bravo';

    tree.appendChild(item1);
    tree.appendChild(item2);
    doc.body.appendChild(tree);

    await terminal.run();

    const renderer = (terminal as unknown as {renderer: Renderer}).renderer;
    const lines = readRows(renderer, 0, ROWS);

    const alphaLine = lines.find((l) => l.includes('Alpha'));
    const bravoLine = lines.find((l) => l.includes('Bravo'));

    expect(alphaLine).toBeDefined();
    expect(bravoLine).toBeDefined();

    /* Full text — no truncation */
    expect(alphaLine).toContain('Alpha');
    expect(bravoLine).toContain('Bravo');

    terminal.exit();
  });

  it('renders expanded tree with indented children', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: createOutput().stream,
      input: createStdin(),
    });

    terminal.window.customElements.define(UiTree.tagName, UiTree);
    terminal.window.customElements.define(UiTreeItem.tagName, UiTreeItem);

    const doc = terminal.document;
    const tree = doc.createElement('ui-tree') as UiTree;
    tree.setAttribute('tabindex', '0');

    const parent = doc.createElement('ui-tree-item');
    parent.setAttribute('expandable', '');
    parent.setAttribute('open', '');
    parent.setAttribute('value', 'src');
    parent.textContent = 'src';

    const child = doc.createElement('ui-tree-item');
    child.setAttribute('value', 'index.ts');
    child.textContent = 'index.ts';
    parent.appendChild(child);

    tree.appendChild(parent);
    doc.body.appendChild(tree);

    await terminal.run();

    const renderer = (terminal as unknown as {renderer: Renderer}).renderer;
    const lines = readRows(renderer, 0, ROWS);

    const srcLine = lines.find((l) => l.includes('src'));
    const indexLine = lines.find((l) => l.includes('index.ts'));

    expect(srcLine).toBeDefined();
    expect(indexLine).toBeDefined();

    /* src should have expand indicator */
    expect(srcLine).toContain('▾');

    /* index.ts should be indented further than src */
    const srcStart = srcLine!.indexOf('▾');
    const indexStart = indexLine!.indexOf('index.ts');

    expect(indexStart).toBeGreaterThan(srcStart);

    terminal.exit();
  });
});
