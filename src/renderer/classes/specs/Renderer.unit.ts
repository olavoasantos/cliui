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
    width: overrides.width ?? 4,
    height: overrides.height ?? 1,
    contentX: overrides.contentX ?? 0,
    contentY: overrides.contentY ?? 0,
    contentWidth: overrides.contentWidth ?? 4,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('Renderer', () => {
  it('renders a first frame from layout boxes into ANSI output', () => {
    const renderer = new Renderer(6, 2);
    const box = createBox({
      textLines: ['AB'],
      computedStyle: style({color: '#ff0000'}),
    });

    const output = renderer.render(box);

    expect(output).toBe('\u001B[1;1H\u001B[38;2;255;0;0mAB');
  });

  it('returns no output when the next frame is unchanged', () => {
    const renderer = new Renderer(6, 2);
    const box = createBox({
      textLines: ['AB'],
      computedStyle: style({color: '#ff0000'}),
    });

    renderer.render(box);
    const output = renderer.render(box);

    expect(output).toBe('');
  });

  it('emits only the changed region on a subsequent frame', () => {
    const renderer = new Renderer(6, 2);

    renderer.render(
      createBox({
        textLines: ['AB'],
        computedStyle: style({color: '#ff0000'}),
      }),
    );

    const output = renderer.render(
      createBox({
        textLines: ['AX'],
        computedStyle: style({color: '#ff0000'}),
      }),
    );

    expect(output).toBe('\u001B[1;2H\u001B[38;2;255;0;0mX');
  });

  it('resizes both internal buffers and re-renders against the new dimensions', () => {
    const renderer = new Renderer(2, 1);

    renderer.render(
      createBox({
        width: 2,
        contentWidth: 2,
        textLines: ['AB'],
      }),
    );

    renderer.resize(4, 1);

    const output = renderer.render(
      createBox({
        width: 4,
        contentWidth: 4,
        textLines: ['ABCD'],
      }),
    );

    expect(renderer.cols).toBe(4);
    expect(renderer.rows).toBe(1);
    expect(output).toBe('\u001B[1;3HCD');
  });

  it('accepts multiple root boxes and renders them in order', () => {
    const renderer = new Renderer(6, 2);

    const output = renderer.render([
      createBox({x: 0, contentX: 0, textLines: ['A']}),
      createBox({x: 2, contentX: 2, textLines: ['B']}),
    ]);

    expect(output).toBe('\u001B[1;1HA\u001B[1;3HB');
  });
});
