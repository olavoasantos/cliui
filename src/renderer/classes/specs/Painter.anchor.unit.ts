import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {CellBuffer} from '../CellBuffer';
import {Painter} from '../Painter';

import type {LayoutBox} from '../../../layout/types';
import type {ComputedStyle} from '../../../css/types';

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function createBox(overrides: Partial<LayoutBox> = {}): LayoutBox {
  const document = new Window().document;

  return {
    element: overrides.element ?? document.createElement('div'),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 10,
    height: overrides.height ?? 1,
    contentX: overrides.contentX ?? 0,
    contentY: overrides.contentY ?? 0,
    contentWidth: overrides.contentWidth ?? 10,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('Painter — anchor hyperlink', () => {
  it('propagates href attribute to cell hyperlink field', () => {
    const document = new Window().document;
    const anchor = document.createElement('a');
    anchor.setAttribute('href', 'https://example.com');

    const painter = new Painter();
    const buffer = new CellBuffer(10, 1);
    const box = createBox({
      element: anchor,
      textLines: ['link'],
      computedStyle: style({color: '#5f87ff', 'text-decoration': 'underline'}),
    });

    painter.paint(box, buffer);

    // First four cells should have the hyperlink set
    for (let x = 0; x < 4; x++) {
      expect(buffer.get(x, 0)?.hyperlink).toBe('https://example.com');
    }
  });

  it('does not set hyperlink when href is absent', () => {
    const document = new Window().document;
    const anchor = document.createElement('a');
    // No href set

    const painter = new Painter();
    const buffer = new CellBuffer(10, 1);
    const box = createBox({
      element: anchor,
      textLines: ['link'],
      computedStyle: style({}),
    });

    painter.paint(box, buffer);

    expect(buffer.get(0, 0)?.hyperlink).toBeNull();
  });

  it('does not set hyperlink on non-anchor elements', () => {
    const painter = new Painter();
    const buffer = new CellBuffer(10, 1);
    const box = createBox({
      textLines: ['text'],
      computedStyle: style({}),
    });

    painter.paint(box, buffer);

    expect(buffer.get(0, 0)?.hyperlink).toBeNull();
  });
});
