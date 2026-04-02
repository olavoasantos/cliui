import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {StyleEngine} from '../../css/classes/StyleEngine';
import {LayoutEngine} from '../../layout/classes/LayoutEngine';
import {Renderer} from '../../renderer/classes/Renderer';

import type {HTMLDialogElement} from '@cliui/dom';

const COLS = 60;
const ROWS = 20;

/**
 * Exactly mirrors Terminal.renderFrame():
 * recomputeDirty → layout → render (paint + diff)
 */
function renderFrame(
  styleEngine: StyleEngine,
  layoutEngine: LayoutEngine,
  renderer: Renderer,
  body: any,
) {
  if (styleEngine.getDirtyElements().size > 0) {
    styleEngine.recomputeDirty();
  }

  const layout = layoutEngine.layout(body, COLS, ROWS);
  renderer.render(layout);

  return {layout, buffer: (renderer as any).previousBuffer};
}

function readRow(buffer: any, y: number): string {
  let row = '';

  for (let x = 0; x < COLS; x++) {
    row += buffer.get(x, y)?.char ?? ' ';
  }

  return row;
}

function findTextRow(buffer: any, text: string): number {
  for (let y = 0; y < ROWS; y++) {
    if (readRow(buffer, y).includes(text)) return y;
  }

  return -1;
}

describe('HTMLDialogElement — viewport centering (end-to-end)', () => {
  function createScene() {
    const window = new Window();
    const document = window.document;
    const styleEngine = new StyleEngine();

    styleEngine.attach(document);
    styleEngine.markAllDirty();

    const layoutEngine = new LayoutEngine(styleEngine);
    const renderer = new Renderer(COLS, ROWS);

    // Same as Terminal constructor
    document.body.style.overflow = 'scroll';

    const style = document.createElement('style');

    style.textContent = 'dialog { width: 30; background-color: #333; color: #fff; }';
    document.head.appendChild(style);

    // 60 lines of content so the page scrolls
    for (let i = 0; i < 60; i++) {
      const line = document.createElement('div');

      line.textContent = `Line ${i}`;
      document.body.appendChild(line);
    }

    const dialog = document.createElement('dialog') as HTMLDialogElement;

    dialog.style.zIndex = '10';

    const msg = document.createElement('div');

    msg.textContent = 'MODAL CONTENT';
    dialog.appendChild(msg);
    document.body.appendChild(dialog);

    return {document, styleEngine, layoutEngine, renderer, dialog};
  }

  it('modal dialog is NOT visible when closed', () => {
    const {document, styleEngine, layoutEngine, renderer} = createScene();

    const frame = renderFrame(styleEngine, layoutEngine, renderer, document.body);

    expect(findTextRow(frame.buffer, 'MODAL CONTENT')).toBe(-1);
  });

  it('modal dialog is centered when opened with no scroll', () => {
    const {document, styleEngine, layoutEngine, renderer, dialog} = createScene();

    // Frame 1: initial render
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    // Open modal
    dialog.showModal();

    // Frame 2: dialog visible
    const frame = renderFrame(styleEngine, layoutEngine, renderer, document.body);
    const row = findTextRow(frame.buffer, 'MODAL CONTENT');

    expect(row).toBeGreaterThanOrEqual(0);

    const expectedCenter = Math.floor(ROWS / 2);

    expect(Math.abs(row - expectedCenter)).toBeLessThanOrEqual(4);
  });

  it('modal dialog is centered when opened AFTER scrolling down', () => {
    const {document, styleEngine, layoutEngine, renderer, dialog} = createScene();

    // Frame 1: initial render
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    // Scroll down (same as Terminal body scroll handler)
    (document.body as any).scrollTop = 40;

    // Frame 2: scrolled, no dialog yet
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    const row0 = readRow((renderer as any).previousBuffer, 0);

    expect(row0).toContain('Line 40');

    // Open modal
    dialog.showModal();

    // Frame 3: dialog should be centered in viewport
    const frame = renderFrame(styleEngine, layoutEngine, renderer, document.body);
    const row = findTextRow(frame.buffer, 'MODAL CONTENT');

    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(ROWS);

    const expectedCenter = Math.floor(ROWS / 2);

    expect(Math.abs(row - expectedCenter)).toBeLessThanOrEqual(4);
  });

  it('modal dialog does not re-center when content size changes ', () => {
    const {document, styleEngine, layoutEngine, renderer, dialog} = createScene();

    // Frame 1: initial render
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    // Open modal
    dialog.showModal();

    // Frame 2: dialog visible and centered
    const frame1 = renderFrame(styleEngine, layoutEngine, renderer, document.body);
    const row1 = findTextRow(frame1.buffer, 'MODAL CONTENT');
    expect(row1).toBeGreaterThanOrEqual(0);

    // Add extra content to the dialog, changing its height
    const extra = document.createElement('div');
    extra.textContent = 'EXTRA LINE 1';
    dialog.appendChild(extra);
    const extra2 = document.createElement('div');
    extra2.textContent = 'EXTRA LINE 2';
    dialog.appendChild(extra2);
    const extra3 = document.createElement('div');
    extra3.textContent = 'EXTRA LINE 3';
    dialog.appendChild(extra3);

    // Frame 3: dialog content changed, should stay at the same position
    const frame2 = renderFrame(styleEngine, layoutEngine, renderer, document.body);
    const row2 = findTextRow(frame2.buffer, 'MODAL CONTENT');

    // The dialog should stay at the same position, not re-center
    expect(row2).toBe(row1);
  });

  it('modal dialog stays centered when user scrolls after opening', () => {
    const {document, styleEngine, layoutEngine, renderer, dialog} = createScene();

    // Frame 1: initial
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    // Scroll to 20, open modal
    (document.body as any).scrollTop = 20;
    renderFrame(styleEngine, layoutEngine, renderer, document.body);
    dialog.showModal();
    renderFrame(styleEngine, layoutEngine, renderer, document.body);

    // Now scroll further to 40
    (document.body as any).scrollTop = 40;

    // Frame: dialog should still be centered
    const frame = renderFrame(styleEngine, layoutEngine, renderer, document.body);
    const row = findTextRow(frame.buffer, 'MODAL CONTENT');

    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(ROWS);

    const expectedCenter = Math.floor(ROWS / 2);

    expect(Math.abs(row - expectedCenter)).toBeLessThanOrEqual(4);
  });
});
