import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
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
    width: overrides.width ?? 8,
    height: overrides.height ?? 4,
    contentX: overrides.contentX ?? 1,
    contentY: overrides.contentY ?? 1,
    contentWidth: overrides.contentWidth ?? 6,
    contentHeight: overrides.contentHeight ?? 2,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('Painter integration', () => {
  it('paints nested layout boxes with borders, clipping, backgrounds, and text into the cell buffer', () => {
    const painter = new Painter();
    const buffer = new CellBuffer(14, 8);
    const child = createBox({
      x: 3,
      y: 2,
      width: 6,
      height: 3,
      contentX: 4,
      contentY: 3,
      contentWidth: 3,
      contentHeight: 1,
      computedStyle: style({
        overflow: 'hidden',
        'background-color': '#0000ff',
        color: '#ffffff',
      }),
      textLines: ['XYZW'],
      zIndex: 1,
    });
    const parent = createBox({
      x: 1,
      y: 1,
      width: 10,
      height: 5,
      contentX: 2,
      contentY: 2,
      contentWidth: 6,
      contentHeight: 2,
      computedStyle: style({
        overflow: 'hidden',
        'background-color': '#112233',
        'border-style': 'rounded',
        'border-color': '#ff0000',
        color: '#00ff00',
      }),
      textLines: ['parent'],
      children: [child],
    });

    painter.paint(parent, buffer);

    expect(buffer.get(2, 2)?.char).toBe('p');
    expect(buffer.get(1, 1)?.char).toBe('╭');
    expect(buffer.get(1, 1)?.fg).toEqual({r: 255, g: 0, b: 0});
    expect(buffer.get(4, 3)?.char).toBe('X');
    expect(buffer.get(4, 3)?.bg).toEqual({r: 0, g: 0, b: 255});
    expect(buffer.get(7, 3)?.char).toBe(' ');
    expect(buffer.get(11, 1)?.char).toBe(' ');
  });
});
