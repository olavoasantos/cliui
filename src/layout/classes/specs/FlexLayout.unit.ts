import {describe, it, expect} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import type {Element} from '../../../dom/classes/Element';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../types';
import {FlexLayout} from '../FlexLayout';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function childBox(element: Element, overrides: Partial<LayoutBox> = {}): LayoutBox {
  return {
    element,
    x: 0,
    y: 0,
    width: overrides.width ?? 10,
    height: overrides.height ?? 3,
    contentX: 0,
    contentY: 0,
    contentWidth: overrides.contentWidth ?? 10,
    contentHeight: overrides.contentHeight ?? 3,
    computedStyle: overrides.computedStyle ?? style({}),
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
    ...overrides,
  };
}

describe('FlexLayout', () => {
  const layout = new FlexLayout();
  const {document} = createEnv();

  describe('basic column layout', () => {
    it('lays out an element with no children at origin', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], [], 80, 24, 0, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(80);
      expect(result.height).toBe(0);
      expect(result.contentX).toBe(0);
      expect(result.contentY).toBe(0);
      expect(result.contentWidth).toBe(80);
      expect(result.contentHeight).toBe(0);
    });

    it('fills available width when width is auto', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], [], 60, 24, 0, 0);

      expect(result.width).toBe(60);
      expect(result.contentWidth).toBe(60);
    });

    it('stacks children vertically', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});
      const c2 = childBox(document.createElement('span'), {height: 3});
      const c3 = childBox(document.createElement('span'), {height: 1});

      const result = layout.layout(el, style({}), [c1, c2, c3], [], 80, 24, 0, 0);

      expect(c1.y).toBe(0);
      expect(c2.y).toBe(2);
      expect(c3.y).toBe(5);
      expect(result.height).toBe(6);
    });

    it('positions children at the content area x', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});

      layout.layout(el, style({}), [c1], [], 80, 24, 5, 10);

      expect(c1.x).toBe(5);
      expect(c1.y).toBe(10);
    });

    it('includes text lines in height calculation', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], ['hello', 'world'], 80, 24, 0, 0);

      expect(result.height).toBe(2);
      expect(result.textLines).toEqual(['hello', 'world']);
    });

    it('returns undefined textLines when there are no text lines', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], [], 80, 24, 0, 0);

      expect(result.textLines).toBeUndefined();
    });
  });

  describe('padding', () => {
    it('offsets the content area by padding', () => {
      const el = document.createElement('div');
      const computed = style({
        'padding-top': '2',
        'padding-right': '3',
        'padding-bottom': '2',
        'padding-left': '3',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.contentX).toBe(3);
      expect(result.contentY).toBe(2);
      expect(result.contentWidth).toBe(80 - 3 - 3);
      expect(result.contentHeight).toBe(0);
      // Height includes top + bottom padding
      expect(result.height).toBe(4);
    });

    it('positions children inside the padded area', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 1});
      const computed = style({
        'padding-top': '1',
        'padding-left': '2',
      });

      layout.layout(el, computed, [c1], [], 80, 24, 0, 0);

      expect(c1.x).toBe(2);
      expect(c1.y).toBe(1);
    });
  });

  describe('margin', () => {
    it('offsets the content area by margin', () => {
      const el = document.createElement('div');
      const computed = style({
        'margin-top': '1',
        'margin-right': '2',
        'margin-bottom': '1',
        'margin-left': '2',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.contentX).toBe(2);
      expect(result.contentY).toBe(1);
      // outer width = available - margin = 80 - 4 = 76
      // total width = outer + margin = 76 + 4 = 80
      expect(result.width).toBe(80);
      expect(result.contentWidth).toBe(76);
      // height includes margin top + bottom
      expect(result.height).toBe(2);
    });

    it('reduces available width for auto-width by margin', () => {
      const el = document.createElement('div');
      const computed = style({
        'margin-left': '5',
        'margin-right': '5',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.contentWidth).toBe(70);
      expect(result.width).toBe(80);
    });
  });

  describe('border', () => {
    it('adds 1 cell per side when border-style is set', () => {
      const el = document.createElement('div');
      const computed = style({'border-style': 'single'});

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.contentX).toBe(1);
      expect(result.contentY).toBe(1);
      expect(result.contentWidth).toBe(78);
      expect(result.height).toBe(2);
    });

    it('does not add border space when border-style is none', () => {
      const el = document.createElement('div');
      const computed = style({'border-style': 'none'});

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.contentX).toBe(0);
      expect(result.contentY).toBe(0);
      expect(result.contentWidth).toBe(80);
      expect(result.height).toBe(0);
    });

    it('does not add border space when border-style is absent', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], [], 80, 24, 0, 0);

      expect(result.contentX).toBe(0);
      expect(result.contentWidth).toBe(80);
    });

    it('supports various border-style values', () => {
      const el = document.createElement('div');

      for (const borderStyle of ['rounded', 'double', 'thick', 'ascii']) {
        const computed = style({'border-style': borderStyle});
        const result = layout.layout(el, computed, [], [], 40, 24, 0, 0);

        expect(result.contentWidth).toBe(38);
      }
    });
  });

  describe('box-sizing: border-box (default)', () => {
    it('includes border and padding in explicit width', () => {
      const el = document.createElement('div');
      const computed = style({
        width: '20',
        'padding-left': '2',
        'padding-right': '2',
        'border-style': 'single',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      // border-box: width 20 = border(1+1) + padding(2+2) + content
      // content = 20 - 6 = 14
      expect(result.contentWidth).toBe(14);
      // total width = outer(20) + margin(0) = 20
      expect(result.width).toBe(20);
    });

    it('includes border and padding in explicit height', () => {
      const el = document.createElement('div');
      const computed = style({
        height: '10',
        'padding-top': '1',
        'padding-bottom': '1',
        'border-style': 'single',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      // border-box: height 10 = border(1+1) + padding(1+1) + content
      // content = 10 - 4 = 6
      expect(result.contentHeight).toBe(6);
      expect(result.height).toBe(10);
    });
  });

  describe('box-sizing: content-box', () => {
    it('adds border and padding on top of explicit width', () => {
      const el = document.createElement('div');
      const computed = style({
        'box-sizing': 'content-box',
        width: '20',
        'padding-left': '2',
        'padding-right': '2',
        'border-style': 'single',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      // content-box: content = 20, outer = 20 + 2 + 2 + 1 + 1 = 26
      expect(result.contentWidth).toBe(20);
      expect(result.width).toBe(26);
    });

    it('adds border and padding on top of explicit height', () => {
      const el = document.createElement('div');
      const computed = style({
        'box-sizing': 'content-box',
        height: '10',
        'padding-top': '1',
        'padding-bottom': '1',
        'border-style': 'single',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      // content-box: content = 10, outer = 10 + 1 + 1 + 1 + 1 = 14
      expect(result.contentHeight).toBe(10);
      // total height = outer(14) + margin(0) = 14
      expect(result.height).toBe(14);
    });
  });

  describe('nested boxes', () => {
    it('positions nested children correctly', () => {
      const el = document.createElement('div');
      const inner = document.createElement('div');
      const innerChild = childBox(document.createElement('span'), {
        height: 1,
        width: 5,
      });
      const innerBox = childBox(inner, {
        height: 5,
        width: 20,
        contentX: 1,
        contentY: 1,
        contentWidth: 18,
        contentHeight: 3,
        children: [innerChild],
        computedStyle: style({
          'border-style': 'single',
        }),
      });

      const computed = style({'padding-top': '2', 'padding-left': '3'});

      layout.layout(el, computed, [innerBox], [], 80, 24, 0, 0);

      // Inner box placed at content area origin (3, 2)
      expect(innerBox.x).toBe(3);
      expect(innerBox.y).toBe(2);
      // Inner box's contentX was 1, now offset by 3 => 4
      expect(innerBox.contentX).toBe(4);
      expect(innerBox.contentY).toBe(3);
      // Inner child was at (0, 0), offset by inner box offset (3, 2)
      expect(innerChild.x).toBe(3);
      expect(innerChild.y).toBe(2);
    });

    it('stacks multiple nested containers', () => {
      const el = document.createElement('div');
      const a = childBox(document.createElement('div'), {height: 4});
      const b = childBox(document.createElement('div'), {height: 6});

      const result = layout.layout(el, style({}), [a, b], [], 80, 24, 0, 0);

      expect(a.y).toBe(0);
      expect(b.y).toBe(4);
      expect(result.height).toBe(10);
    });
  });

  describe('combined box model', () => {
    it('handles padding + border + margin together', () => {
      const el = document.createElement('div');
      const computed = style({
        'margin-top': '1',
        'margin-bottom': '1',
        'margin-left': '2',
        'margin-right': '2',
        'padding-top': '1',
        'padding-bottom': '1',
        'padding-left': '2',
        'padding-right': '2',
        'border-style': 'single',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      // outer width = available - horizontal margin = 80 - 4 = 76
      // content = outer - border(2) - padding(4) = 76 - 2 - 4 = 70
      expect(result.contentWidth).toBe(70);
      // contentX = margin-left(2) + border(1) + padding(2) = 5
      expect(result.contentX).toBe(5);
      // contentY = margin-top(1) + border(1) + padding(1) = 3
      expect(result.contentY).toBe(3);
      // total width = outer(76) + margin(4) = 80
      expect(result.width).toBe(80);
      // outer height = border(2) + padding(2) + content(0) = 4
      // total height = outer(4) + margin(2) = 6
      expect(result.height).toBe(6);
    });

    it('positions children inside the combined inset', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});
      const computed = style({
        'margin-top': '1',
        'margin-left': '2',
        'padding-top': '1',
        'padding-left': '3',
        'border-style': 'rounded',
      });

      layout.layout(el, computed, [c1], [], 80, 24, 0, 0);

      // x: margin(2) + border(1) + padding(3) = 6
      expect(c1.x).toBe(6);
      // y: margin(1) + border(1) + padding(1) = 3
      expect(c1.y).toBe(3);
    });
  });

  describe('z-index', () => {
    it('defaults z-index to 0', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({}), [], [], 80, 24, 0, 0);

      expect(result.zIndex).toBe(0);
    });

    it('reads z-index from computed style', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({'z-index': '5'}), [], [], 80, 24, 0, 0);

      expect(result.zIndex).toBe(5);
    });
  });

  describe('offset positioning', () => {
    it('positions everything relative to the given x/y origin', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});
      const computed = style({'padding-top': '1', 'padding-left': '1'});

      const result = layout.layout(el, computed, [c1], [], 80, 24, 10, 5);

      expect(result.x).toBe(10);
      expect(result.y).toBe(5);
      expect(result.contentX).toBe(11);
      expect(result.contentY).toBe(6);
      expect(c1.x).toBe(11);
      expect(c1.y).toBe(6);
    });
  });

  describe('flex direction', () => {
    it('lays out children horizontally for row direction', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 6, height: 3});
      const c3 = childBox(document.createElement('span'), {width: 2, height: 1});

      const result = layout.layout(
        el,
        style({'flex-direction': 'row'}),
        [c1, c2, c3],
        [],
        80,
        24,
        0,
        0,
      );

      expect(c1.x).toBe(0);
      expect(c2.x).toBe(4);
      expect(c3.x).toBe(10);
      expect(c1.y).toBe(0);
      expect(c2.y).toBe(0);
      expect(c3.y).toBe(0);
      expect(result.width).toBe(80);
      expect(result.height).toBe(3);
      expect(result.contentHeight).toBe(3);
    });

    it('reverses horizontal visual order for row-reverse', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 6, height: 3});
      const c3 = childBox(document.createElement('span'), {width: 2, height: 1});

      layout.layout(el, style({'flex-direction': 'row-reverse'}), [c1, c2, c3], [], 80, 24, 0, 0);

      expect(c3.x).toBe(0);
      expect(c2.x).toBe(2);
      expect(c1.x).toBe(8);
      expect(c1.y).toBe(0);
      expect(c2.y).toBe(0);
      expect(c3.y).toBe(0);
    });

    it('reverses vertical visual order for column-reverse', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});
      const c2 = childBox(document.createElement('span'), {height: 3});
      const c3 = childBox(document.createElement('span'), {height: 1});

      const result = layout.layout(
        el,
        style({'flex-direction': 'column-reverse'}),
        [c1, c2, c3],
        [],
        80,
        24,
        0,
        0,
      );

      expect(c3.y).toBe(0);
      expect(c2.y).toBe(1);
      expect(c1.y).toBe(4);
      expect(result.height).toBe(6);
    });
  });

  describe('flex sizing', () => {
    it('distributes positive free space using flex-grow ratios', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '1'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 6,
        height: 2,
        computedStyle: style({'flex-grow': '2'}),
      });

      layout.layout(el, style({'flex-direction': 'row'}), [c1, c2], [], 22, 24, 0, 0);

      expect(c1.width).toBe(8);
      expect(c2.width).toBe(14);
      expect(c2.x).toBe(8);
    });

    it('shrinks overflowing items proportionally using flex-shrink', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 6,
        height: 2,
        computedStyle: style({'flex-shrink': '1'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 6,
        height: 2,
        computedStyle: style({'flex-shrink': '1'}),
      });

      layout.layout(el, style({'flex-direction': 'row'}), [c1, c2], [], 8, 24, 0, 0);

      expect(c1.width).toBe(4);
      expect(c2.width).toBe(4);
      expect(c2.x).toBe(4);
    });

    it('uses flex-basis as the main-axis base size', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 10,
        height: 2,
        computedStyle: style({'flex-basis': '3', 'flex-grow': '0', 'flex-shrink': '0'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 10,
        height: 2,
        computedStyle: style({'flex-basis': '5', 'flex-grow': '0', 'flex-shrink': '0'}),
      });

      layout.layout(el, style({'flex-direction': 'row'}), [c1, c2], [], 20, 24, 0, 0);

      expect(c1.width).toBe(3);
      expect(c2.width).toBe(5);
      expect(c2.x).toBe(3);
    });

    it('leaves items unchanged when flex-grow and flex-shrink are zero', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '0', 'flex-shrink': '0'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 6,
        height: 2,
        computedStyle: style({'flex-grow': '0', 'flex-shrink': '0'}),
      });

      layout.layout(el, style({'flex-direction': 'row'}), [c1, c2], [], 20, 24, 0, 0);

      expect(c1.width).toBe(4);
      expect(c2.width).toBe(6);
      expect(c2.x).toBe(4);
    });
  });

  describe('flex alignment', () => {
    it('centers items on the main axis with justify-content: center', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 4, height: 2});

      layout.layout(
        el,
        style({'flex-direction': 'row', 'justify-content': 'center'}),
        [c1, c2],
        [],
        20,
        24,
        0,
        0,
      );

      expect(c1.x).toBe(6);
      expect(c2.x).toBe(10);
    });

    it('distributes space between items with justify-content: space-between', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 4, height: 2});

      layout.layout(
        el,
        style({'flex-direction': 'row', 'justify-content': 'space-between'}),
        [c1, c2],
        [],
        20,
        24,
        0,
        0,
      );

      expect(c1.x).toBe(0);
      expect(c2.x).toBe(16);
    });

    it('centers items on the cross axis with align-items: center', () => {
      const el = document.createElement('div');
      const child = childBox(document.createElement('span'), {width: 4, height: 2});

      layout.layout(
        el,
        style({'flex-direction': 'row', height: '10', 'align-items': 'center'}),
        [child],
        [],
        20,
        24,
        0,
        0,
      );

      expect(child.y).toBe(4);
    });

    it('lets align-self override align-items for an individual item', () => {
      const el = document.createElement('div');
      const child = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'align-self': 'flex-end'}),
      });

      layout.layout(
        el,
        style({'flex-direction': 'row', height: '10', 'align-items': 'flex-start'}),
        [child],
        [],
        20,
        24,
        0,
        0,
      );

      expect(child.y).toBe(8);
    });

    it('stretches items on the cross axis when align-items is stretch', () => {
      const el = document.createElement('div');
      const child = childBox(document.createElement('span'), {
        width: 2,
        height: 2,
        contentWidth: 2,
        contentHeight: 2,
      });

      layout.layout(
        el,
        style({'flex-direction': 'column', width: '10', 'align-items': 'stretch'}),
        [child],
        [],
        20,
        24,
        0,
        0,
      );

      expect(child.width).toBe(10);
      expect(child.contentWidth).toBe(10);
    });
  });

  describe('flex gap', () => {
    it('adds horizontal spacing between row items with column-gap', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 4, height: 2});

      layout.layout(
        el,
        style({'flex-direction': 'row', 'column-gap': '3'}),
        [c1, c2],
        [],
        20,
        24,
        0,
        0,
      );

      expect(c2.x).toBe(7);
    });

    it('adds vertical spacing between column items with row-gap', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {height: 2});
      const c2 = childBox(document.createElement('span'), {height: 3});
      const result = layout.layout(el, style({'row-gap': '2'}), [c1, c2], [], 20, 24, 0, 0);

      expect(c2.y).toBe(4);
      expect(result.height).toBe(7);
    });

    it('accounts for gap before flex-grow distribution', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '1'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '1'}),
      });

      layout.layout(
        el,
        style({'flex-direction': 'row', 'column-gap': '2'}),
        [c1, c2],
        [],
        20,
        24,
        0,
        0,
      );

      expect(c1.width).toBe(9);
      expect(c2.width).toBe(9);
      expect(c2.x).toBe(11);
    });
  });

  describe('flex wrapping', () => {
    it('wraps row items onto multiple lines when they exceed the container width', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 2});
      const c2 = childBox(document.createElement('span'), {width: 4, height: 3});
      const c3 = childBox(document.createElement('span'), {width: 4, height: 1});

      const result = layout.layout(
        el,
        style({'flex-direction': 'row', 'flex-wrap': 'wrap'}),
        [c1, c2, c3],
        [],
        10,
        24,
        0,
        0,
      );

      expect(c1.x).toBe(0);
      expect(c1.y).toBe(0);
      expect(c2.x).toBe(4);
      expect(c2.y).toBe(0);
      expect(c3.x).toBe(0);
      expect(c3.y).toBe(3);
      expect(result.height).toBe(4);
    });

    it('sizes and aligns each wrapped line independently', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 3,
        height: 2,
        computedStyle: style({'flex-grow': '1'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 3,
        height: 1,
        computedStyle: style({'flex-grow': '1'}),
      });
      const c3 = childBox(document.createElement('span'), {
        width: 3,
        height: 2,
        computedStyle: style({'flex-grow': '1'}),
      });

      layout.layout(
        el,
        style({
          'flex-direction': 'row',
          'flex-wrap': 'wrap',
          'justify-content': 'center',
          'column-gap': '1',
          'row-gap': '2',
        }),
        [c1, c2, c3],
        [],
        10,
        24,
        0,
        0,
      );

      expect(c1.width).toBe(5);
      expect(c2.width).toBe(4);
      expect(c1.x).toBe(0);
      expect(c2.x).toBe(6);
      expect(c3.width).toBe(10);
      expect(c3.x).toBe(0);
      expect(c3.y).toBe(4);
    });

    it('uses the tallest item in each row to determine the next line position', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {width: 4, height: 1});
      const c2 = childBox(document.createElement('span'), {width: 4, height: 3});
      const c3 = childBox(document.createElement('span'), {width: 4, height: 2});

      layout.layout(
        el,
        style({'flex-direction': 'row', 'flex-wrap': 'wrap', 'row-gap': '1'}),
        [c1, c2, c3],
        [],
        9,
        24,
        0,
        0,
      );

      expect(c3.y).toBe(4);
    });
  });

  describe('explicit sizing and constraints', () => {
    it('clamps explicit width up to min-width', () => {
      const el = document.createElement('div');
      const result = layout.layout(el, style({width: '4', 'min-width': '6'}), [], [], 20, 24, 0, 0);

      expect(result.width).toBe(6);
      expect(result.contentWidth).toBe(6);
    });

    it('clamps explicit width down to max-width', () => {
      const el = document.createElement('div');
      const result = layout.layout(
        el,
        style({width: '12', 'max-width': '8'}),
        [],
        [],
        20,
        24,
        0,
        0,
      );

      expect(result.width).toBe(8);
      expect(result.contentWidth).toBe(8);
    });

    it('clamps flexed item widths after grow distribution', () => {
      const el = document.createElement('div');
      const c1 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '1', 'max-width': '6'}),
      });
      const c2 = childBox(document.createElement('span'), {
        width: 4,
        height: 2,
        computedStyle: style({'flex-grow': '1', 'min-width': '8'}),
      });

      layout.layout(el, style({'flex-direction': 'row'}), [c1, c2], [], 20, 24, 0, 0);

      expect(c1.width).toBe(6);
      expect(c2.width).toBe(10);
    });
  });

  describe('explicit dimensions', () => {
    it('uses explicit width in border-box mode', () => {
      const el = document.createElement('div');
      const computed = style({width: '40'});

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.width).toBe(40);
      expect(result.contentWidth).toBe(40);
    });

    it('uses explicit height in border-box mode', () => {
      const el = document.createElement('div');
      const computed = style({height: '12'});

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.height).toBe(12);
      expect(result.contentHeight).toBe(12);
    });

    it('clamps content dimensions to zero when border+padding exceeds explicit size', () => {
      const el = document.createElement('div');
      const computed = style({
        width: '4',
        height: '2',
        'padding-left': '3',
        'padding-right': '3',
        'padding-top': '2',
        'padding-bottom': '2',
      });

      const result = layout.layout(el, computed, [], [], 80, 24, 0, 0);

      expect(result.contentWidth).toBe(0);
      expect(result.contentHeight).toBe(0);
    });
  });
});
