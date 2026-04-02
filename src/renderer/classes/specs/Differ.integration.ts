import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {CellBuffer} from '../CellBuffer';
import {Differ} from '../Differ';
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
    height: overrides.height ?? 3,
    contentX: overrides.contentX ?? 1,
    contentY: overrides.contentY ?? 1,
    contentWidth: overrides.contentWidth ?? 6,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('Differ integration', () => {
  it('produces minimal row-local updates for painted frames with mixed text and style changes', () => {
    const painter = new Painter();
    const differ = new Differ();
    const previous = new CellBuffer(12, 5);
    const current = new CellBuffer(12, 5);

    painter.paint(
      createBox({
        x: 1,
        y: 1,
        width: 8,
        height: 3,
        contentX: 2,
        contentY: 2,
        contentWidth: 5,
        contentHeight: 1,
        computedStyle: style({
          'background-color': '#111111',
          color: '#ff0000',
          'border-style': 'single',
        }),
        textLines: ['HELLO'],
      }),
      previous,
    );

    painter.paint(
      createBox({
        x: 1,
        y: 1,
        width: 8,
        height: 3,
        contentX: 2,
        contentY: 2,
        contentWidth: 5,
        contentHeight: 1,
        computedStyle: style({
          'background-color': '#111111',
          color: '#00ff00',
          'border-style': 'single',
        }),
        textLines: ['HEXLO'],
      }),
      current,
    );

    const regions = differ.diff(previous, current);

    expect(regions).toHaveLength(1);
    expect(regions[0]!.x).toBe(2);
    expect(regions[0]!.y).toBe(2);
    expect(regions[0]!.cells).toHaveLength(6);
    expect(regions[0]!.cells[2]).toEqual(
      expect.objectContaining({char: 'X', fg: {r: 0, g: 255, b: 0}}),
    );
  });
});
