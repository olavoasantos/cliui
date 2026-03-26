import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {CellBuffer} from '../CellBuffer';
import {Differ} from '../Differ';
import {Painter} from '../Painter';
import {ANSIWriter} from '../ANSIWriter';

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
    width: overrides.width ?? 7,
    height: overrides.height ?? 3,
    contentX: overrides.contentX ?? 1,
    contentY: overrides.contentY ?? 1,
    contentWidth: overrides.contentWidth ?? 5,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('ANSIWriter integration', () => {
  it('serializes painter and differ output into minimal ANSI updates across frames', () => {
    const painter = new Painter();
    const differ = new Differ();
    const writer = new ANSIWriter();
    const previous = new CellBuffer(12, 5);
    const current = new CellBuffer(12, 5);

    painter.paint(
      createBox({
        x: 1,
        y: 1,
        computedStyle: style({
          'background-color': '#101010',
          color: '#ff0000',
          'font-weight': 'bold',
        }),
        textLines: ['AB'],
      }),
      previous,
    );
    painter.paint(
      createBox({
        x: 1,
        y: 1,
        computedStyle: style({
          'background-color': '#101010',
          color: '#00ff00',
          'font-weight': 'bold',
        }),
        textLines: ['AX'],
      }),
      current,
    );

    const output = writer.write(differ.diff(previous, current));

    expect(output).toContain('\u001B[2;2H');
    expect(output).toContain('\u001B[1;38;2;0;255;0;48;2;16;16;16mAX');
    expect(output).toContain('\u001B[3;2H');
  });
});
