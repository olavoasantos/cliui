import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {TextLayout} from '../TextLayout';
import {FlexLayout} from '../FlexLayout';

import type {Element} from '../../../dom/classes/Element';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../types';

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function childBox(element: Element, overrides: Partial<LayoutBox> = {}): LayoutBox {
  return {
    element,
    x: 0,
    y: 0,
    width: overrides.width ?? 6,
    height: overrides.height ?? 1,
    contentX: 0,
    contentY: 0,
    contentWidth: overrides.contentWidth ?? 6,
    contentHeight: overrides.contentHeight ?? 1,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
    ...overrides,
  };
}

describe('FlexLayout integration', () => {
  it('combines measured text child boxes with wrapping and alignment in a padded row container', () => {
    const document = new Window().document;
    const textLayout = new TextLayout();
    const flexLayout = new FlexLayout();
    const first = document.createElement('article');
    const second = document.createElement('article');
    const third = document.createElement('article');

    const firstLines = textLayout.measure('alpha beta', 6);
    const secondLines = textLayout.measure('gamma delta', 6);
    const thirdLines = textLayout.measure('omega', 6);

    const children = [
      childBox(first, {
        width: 6,
        height: firstLines.length,
        contentWidth: 6,
        contentHeight: firstLines.length,
        textLines: firstLines.map((line) => line.text),
      }),
      childBox(second, {
        width: 6,
        height: secondLines.length,
        contentWidth: 6,
        contentHeight: secondLines.length,
        textLines: secondLines.map((line) => line.text),
      }),
      childBox(third, {
        width: 6,
        height: thirdLines.length,
        contentWidth: 6,
        contentHeight: thirdLines.length,
        textLines: thirdLines.map((line) => line.text),
      }),
    ];

    const container = document.createElement('section');
    const box = flexLayout.layout(
      container,
      style({
        'flex-direction': 'row',
        'flex-wrap': 'wrap',
        'justify-content': 'center',
        'align-items': 'center',
        'padding-top': '1',
        'padding-left': '2',
        'padding-right': '2',
        'column-gap': '1',
        'row-gap': '1',
      }),
      children,
      [],
      17,
      20,
      0,
      0,
    );

    expect(box.contentX).toBe(2);
    expect(box.contentY).toBe(1);
    expect(box.contentWidth).toBe(13);
    expect(children[0]!.x).toBe(2);
    expect(children[0]!.y).toBe(1);
    expect(children[1]!.x).toBe(9);
    expect(children[1]!.y).toBe(1);
    expect(children[2]!.x).toBe(5);
    expect(children[2]!.y).toBe(4);
    expect(children[0]!.textLines).toEqual(['alpha', 'beta']);
    expect(children[1]!.textLines).toEqual(['gamma', 'delta']);
    expect(children[2]!.textLines).toEqual(['omega']);
    expect(box.height).toBe(5);
  });
});
