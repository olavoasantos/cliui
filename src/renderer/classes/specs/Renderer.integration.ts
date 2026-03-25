import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import type {LayoutBox} from '../../../layout/types';
import type {ComputedStyle} from '../../../css/types';
import {Renderer} from '../Renderer';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function createBox(overrides: Partial<LayoutBox> = {}): LayoutBox {
  const {document} = createEnv();

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

describe('Renderer integration', () => {
  it('runs the full paint, diff, and ANSI output pipeline for styled layout boxes', () => {
    const renderer = new Renderer(8, 4);
    const box = createBox({
      x: 1,
      y: 1,
      contentX: 2,
      contentY: 2,
      computedStyle: style({
        'background-color': '#112233',
        'border-style': 'single',
        'border-color': '#ff0000',
        color: '#00ff00',
        'font-weight': 'bold',
      }),
      textLines: ['Hi'],
    });

    const output = renderer.render(box);

    expect(output).toContain('\u001B[2;2H');
    expect(output).toContain('┌');
    expect(output).toContain('Hi');
    expect(output).toContain('38;2;255;0;0');
    expect(output).toContain('\u001B[38;2;0;255;0m');
  });
});
