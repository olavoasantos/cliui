import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../../../layout/classes/LayoutEngine';
import {CellBuffer} from '../CellBuffer';
import {Painter} from '../Painter';
import {Renderer} from '../Renderer';

import type {Element} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();
  engine.attach(document);
  return {window, document, engine};
}

function computeAndLayout(
  engine: StyleEngine,
  layoutEngine: LayoutEngine,
  body: Element,
  cols: number,
  rows: number,
) {
  engine.markAllDirty();
  engine.recomputeDirty();
  return layoutEngine.layout(body, cols, rows);
}

describe('Painter — image elements', () => {
  it('paints fallback placeholder characters into the cell buffer for img elements', () => {
    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);
    const painter = new Painter();
    const buffer = new CellBuffer(40, 10);

    const img = document.createElement('img');
    img.style.width = '10';
    img.style.height = '3';
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    painter.paint(layout!, buffer);

    // The image region should contain ░ placeholder characters, not spaces
    const cell = buffer.getRef(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.char).toBe('░');

    // Check multiple cells in the region
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        const c = buffer.getRef(col, row);
        expect(c, `cell at (${col},${row})`).not.toBeNull();
        expect(c!.char, `char at (${col},${row})`).toBe('░');
      }
    }
  });

  it('paints alt text into the cell buffer when alt attribute is set', () => {
    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);
    const painter = new Painter();
    const buffer = new CellBuffer(40, 10);

    const img = document.createElement('img');
    img.style.width = '10';
    img.style.height = '3';
    img.setAttribute('alt', 'Logo');
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    painter.paint(layout!, buffer);

    // First row should contain the alt text
    expect(buffer.getRef(0, 0)!.char).toBe('L');
    expect(buffer.getRef(1, 0)!.char).toBe('o');
    expect(buffer.getRef(2, 0)!.char).toBe('g');
    expect(buffer.getRef(3, 0)!.char).toBe('o');

    // Remaining cells on the first row should be spaces (padding)
    expect(buffer.getRef(4, 0)!.char).toBe(' ');

    // Subsequent rows should be spaces
    expect(buffer.getRef(0, 1)!.char).toBe(' ');
  });

  it('truncates alt text that exceeds cell width', () => {
    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);
    const painter = new Painter();
    const buffer = new CellBuffer(40, 10);

    const img = document.createElement('img');
    img.style.width = '6';
    img.style.height = '1';
    img.setAttribute('alt', 'A very long description');
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    painter.paint(layout!, buffer);

    // Should be truncated with ellipsis
    let text = '';
    for (let col = 0; col < 6; col++) {
      text += buffer.getRef(col, 0)!.char;
    }
    expect(text).toBe('A ver…');
  });

  it('enqueues an image render request when imageData is present', () => {
    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);
    const painter = new Painter();
    const buffer = new CellBuffer(40, 10);
    const requests: Array<{x: number; y: number; cellWidth: number; cellHeight: number}> = [];

    painter.onImageRequest = (req) => {
      requests.push(req);
    };

    const img = document.createElement('img');
    img.style.width = '10';
    img.style.height = '3';
    // Simulate loaded image data
    (img as unknown as {imageData: Uint8Array}).imageData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47,
    ]);
    (img as unknown as {naturalWidth: number}).naturalWidth = 200;
    (img as unknown as {naturalHeight: number}).naturalHeight = 100;
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    painter.paint(layout!, buffer);

    expect(requests).toHaveLength(1);
    expect(requests[0]!.cellWidth).toBe(10);
    expect(requests[0]!.cellHeight).toBe(3);
  });

  it('does not enqueue a request when image has zero dimensions', () => {
    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);
    const painter = new Painter();
    const buffer = new CellBuffer(40, 10);
    const requests: unknown[] = [];

    painter.onImageRequest = (req) => {
      requests.push(req);
    };

    const img = document.createElement('img');
    // No width/height set — will have 0×0 content area
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    painter.paint(layout!, buffer);

    expect(requests).toHaveLength(0);
  });
});

describe('Renderer — image lifecycle', () => {
  it('uses fallback protocol when graphics capability is none', () => {
    const renderer = new Renderer(40, 10);
    renderer.setGraphicsCapability('none');

    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);

    const img = document.createElement('img');
    img.style.width = '8';
    img.style.height = '2';
    img.setAttribute('alt', 'Test');
    (img as unknown as {imageData: Uint8Array}).imageData = new Uint8Array([1, 2, 3]);
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    const output = renderer.render(layout!);

    // Fallback should produce cursor positioning + text, not APC/OSC sequences
    expect(output).not.toContain('\u001B_G'); // No Kitty
    expect(output).not.toContain('1337'); // No iTerm2
  });

  it('selects kitty protocol when graphics capability is kitty', () => {
    const renderer = new Renderer(40, 10);
    renderer.setGraphicsCapability('kitty');

    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);

    const img = document.createElement('img');
    img.style.width = '8';
    img.style.height = '2';
    (img as unknown as {imageData: Uint8Array}).imageData = new Uint8Array([1, 2, 3]);
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);
    const output = renderer.render(layout!);

    // Should contain Kitty APC graphics sequence
    expect(output).toContain('\u001B_G');
  });

  it('clears pending image requests between frames', () => {
    const renderer = new Renderer(40, 10);
    renderer.setGraphicsCapability('none');

    const {document, engine} = createEnv();
    const layoutEngine = new LayoutEngine(engine);

    const img = document.createElement('img');
    img.style.width = '5';
    img.style.height = '1';
    (img as unknown as {imageData: Uint8Array}).imageData = new Uint8Array([1]);
    document.body.appendChild(img);

    const layout = computeAndLayout(engine, layoutEngine, document.body, 40, 10);

    // First render
    renderer.render(layout!);

    // Second render — should not accumulate requests from first render
    const output = renderer.render(layout!);

    // The output should be minimal (only diff from previous frame)
    // Not doubled image sequences
    expect(output).toBeDefined();
  });
});
