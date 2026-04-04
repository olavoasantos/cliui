import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
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

    // The ANSIWriter persists SGR state across frames — the terminal already
    // has red foreground from the first render, so only the cursor move and
    // changed character are needed.
    expect(output).toBe('\u001B[1;2HX');
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
    expect(output).toBe('\u001B[1;1HABCD');
  });

  it('accepts multiple root boxes and renders them in order', () => {
    const renderer = new Renderer(6, 2);

    const output = renderer.render([
      createBox({x: 0, contentX: 0, textLines: ['A']}),
      createBox({x: 2, contentX: 2, textLines: ['B']}),
    ]);

    expect(output).toBe('\u001B[1;1HA\u001B[1;3HB');
  });

  it('preserves the previous frame when capabilities are unchanged', () => {
    const renderer = new Renderer(20, 8);

    renderer.setSynchronizedOutputEnabled(false);
    renderer.setColorProfile('truecolor');
    renderer.render([
      createBox({y: 5, contentY: 5, textLines: ['Focus: body']}),
      createBox({y: 6, contentY: 6, textLines: ['Observed: ready']}),
    ]);

    renderer.setSynchronizedOutputEnabled(false);
    renderer.setColorProfile('truecolor');
    const output = renderer.render([
      createBox({y: 4, contentY: 4, textLines: ['Focus: stage']}),
      createBox({y: 5, contentY: 5, textLines: ['Observed: tab']}),
    ]);

    expect(output).toContain('\u001B[7;1H');
    expect(output).toMatch(new RegExp(String.raw`\u001B\[7;1H +`, 'u'));
  });

  it('invalidates the previous frame when synchronized output changes', () => {
    const renderer = new Renderer(6, 2);
    const box = createBox({textLines: ['AB']});

    renderer.render(box);
    renderer.setSynchronizedOutputEnabled(true);

    const output = renderer.render(box);

    expect(output).toBe('\u001B[?2026h\u001B[1;1HAB\u001B[?2026l');
  });

  it('invalidates the previous frame when the color profile changes', () => {
    const renderer = new Renderer(6, 2);
    const box = createBox({
      textLines: ['AB'],
      computedStyle: style({color: '#ff0000'}),
    });

    renderer.render(box);
    renderer.setColorProfile('ansi16');

    const output = renderer.render(box);

    expect(output).toBe('\u001B[1;1H\u001B[91mAB');
  });

  it('swaps buffers across consecutive renders after a resize reset', () => {
    const renderer = new Renderer(4, 1);

    renderer.render(createBox({width: 4, contentWidth: 4, textLines: ['ABCD']}));
    renderer.resize(5, 1);

    const firstAfterResize = renderer.render(
      createBox({width: 5, contentWidth: 5, textLines: ['ABCDE']}),
    );
    const secondAfterResize = renderer.render(
      createBox({width: 5, contentWidth: 5, textLines: ['ABCDE']}),
    );
    const changedFrame = renderer.render(
      createBox({width: 5, contentWidth: 5, textLines: ['ABCXE']}),
    );

    expect(firstAfterResize).toBe('\u001B[1;1HABCDE');
    expect(secondAfterResize).toBe('');
    expect(changedFrame).toBe('\u001B[1;4HX');
  });
});
