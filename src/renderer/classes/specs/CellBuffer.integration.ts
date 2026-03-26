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
    width: overrides.width ?? 6,
    height: overrides.height ?? 3,
    contentX: overrides.contentX ?? 1,
    contentY: overrides.contentY ?? 1,
    contentWidth: overrides.contentWidth ?? 4,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('CellBuffer integration', () => {
  it('preserves painted overlap across resizes while clipping new writes to bounds', () => {
    const painter = new Painter();
    const buffer = new CellBuffer(6, 4);

    painter.paint(
      createBox({
        x: 1,
        y: 1,
        computedStyle: style({
          'background-color': '#112233',
          color: '#ffffff',
        }),
        textLines: ['AB'],
      }),
      buffer,
    );

    buffer.resize(4, 3);

    expect(buffer.get(2, 1)?.char).toBe('B');
    expect(buffer.get(2, 1)?.bg).toEqual({r: 17, g: 34, b: 51});
    expect(buffer.get(5, 3)).toBeUndefined();

    painter.paint(
      createBox({
        x: 3,
        y: 2,
        width: 4,
        height: 2,
        contentX: 3,
        contentY: 2,
        contentWidth: 4,
        contentHeight: 1,
        textLines: ['XYZ'],
      }),
      buffer,
    );

    expect(buffer.get(3, 2)?.char).toBe('X');
    expect(buffer.get(4, 2)).toBeUndefined();
  });
});
