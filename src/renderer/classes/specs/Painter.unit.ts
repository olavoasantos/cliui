import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import type {LayoutBox} from '../../../layout/types';
import type {ComputedStyle} from '../../../css/types';
import {CellBuffer} from '../CellBuffer';
import {Painter} from '../Painter';

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
    height: overrides.height ?? 4,
    contentX: overrides.contentX ?? 0,
    contentY: overrides.contentY ?? 0,
    contentWidth: overrides.contentWidth ?? 6,
    contentHeight: overrides.contentHeight ?? 4,
    computedStyle: overrides.computedStyle ?? style({}),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

describe('Painter', () => {
  const painter = new Painter();

  describe('background fills', () => {
    it('fills the visible box area with background color', () => {
      const buffer = new CellBuffer(8, 6);
      const box = createBox({
        x: 1,
        y: 1,
        width: 4,
        height: 3,
        contentX: 1,
        contentY: 1,
        contentWidth: 4,
        contentHeight: 3,
        computedStyle: style({'background-color': '#112233'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(1, 1)?.bg).toEqual({r: 17, g: 34, b: 51});
      expect(buffer.get(4, 3)?.bg).toEqual({r: 17, g: 34, b: 51});
      expect(buffer.get(0, 0)?.bg).toBeNull();
    });

    it('excludes margins from the painted background area', () => {
      const buffer = new CellBuffer(8, 6);
      const box = createBox({
        x: 0,
        y: 0,
        width: 6,
        height: 4,
        contentX: 2,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 2,
        computedStyle: style({
          'background-color': '#010203',
          'margin-left': '1',
          'margin-right': '1',
        }),
      });

      painter.paint(box, buffer);

      expect(buffer.get(0, 0)?.bg).toBeNull();
      expect(buffer.get(1, 0)?.bg).toEqual({r: 1, g: 2, b: 3});
      expect(buffer.get(4, 3)?.bg).toEqual({r: 1, g: 2, b: 3});
      expect(buffer.get(5, 0)?.bg).toBeNull();
    });
  });

  describe('border painting', () => {
    it('draws single borders with the expected box-drawing characters', () => {
      const buffer = new CellBuffer(8, 6);
      const box = createBox({
        x: 1,
        y: 1,
        width: 4,
        height: 3,
        contentX: 2,
        contentY: 2,
        contentWidth: 2,
        contentHeight: 1,
        computedStyle: style({'border-style': 'single', 'border-color': 'red'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(1, 1)?.char).toBe('┌');
      expect(buffer.get(2, 1)?.char).toBe('─');
      expect(buffer.get(4, 1)?.char).toBe('┐');
      expect(buffer.get(1, 2)?.char).toBe('│');
      expect(buffer.get(4, 2)?.char).toBe('│');
      expect(buffer.get(1, 3)?.char).toBe('└');
      expect(buffer.get(4, 3)?.char).toBe('┘');
      expect(buffer.get(1, 1)?.fg).toEqual({r: 255, g: 0, b: 0});
    });

    it('draws each supported phase-1 border style', () => {
      const styles: Array<[string, string]> = [
        ['rounded', '╭'],
        ['double', '╔'],
        ['thick', '┏'],
        ['ascii', '+'],
      ];

      for (const [borderStyle, expectedCorner] of styles) {
        const buffer = new CellBuffer(6, 4);
        const box = createBox({
          width: 4,
          height: 3,
          contentX: 1,
          contentY: 1,
          contentWidth: 2,
          contentHeight: 1,
          computedStyle: style({'border-style': borderStyle}),
        });

        painter.paint(box, buffer);

        expect(buffer.get(0, 0)?.char).toBe(expectedCorner);
      }
    });

    it('draws block borders with full block characters', () => {
      const buffer = new CellBuffer(6, 4);
      const box = createBox({
        width: 4,
        height: 3,
        contentX: 1,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 1,
        computedStyle: style({'border-style': 'block'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(0, 0)?.char).toBe('█');
      expect(buffer.get(1, 0)?.char).toBe('█');
      expect(buffer.get(0, 1)?.char).toBe('█');
      expect(buffer.get(3, 1)?.char).toBe('█');
      expect(buffer.get(1, 2)?.char).toBe('█');
      expect(buffer.get(3, 2)?.char).toBe('█');
    });

    it('draws half-block borders with directional edge and corner glyphs', () => {
      const buffer = new CellBuffer(6, 4);
      const box = createBox({
        width: 4,
        height: 3,
        contentX: 1,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 1,
        computedStyle: style({'border-style': 'half-block'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(0, 0)?.char).toBe('▛');
      expect(buffer.get(1, 0)?.char).toBe('▀');
      expect(buffer.get(3, 0)?.char).toBe('▜');
      expect(buffer.get(0, 1)?.char).toBe('▌');
      expect(buffer.get(3, 1)?.char).toBe('▐');
      expect(buffer.get(0, 2)?.char).toBe('▙');
      expect(buffer.get(1, 2)?.char).toBe('▄');
      expect(buffer.get(3, 2)?.char).toBe('▟');
    });

    it('uses spaces for hidden borders while preserving border occupancy', () => {
      const buffer = new CellBuffer(6, 4);
      const box = createBox({
        width: 4,
        height: 3,
        contentX: 1,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 1,
        computedStyle: style({'border-style': 'hidden', 'background-color': '#222222'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(0, 0)?.char).toBe(' ');
      expect(buffer.get(1, 0)?.char).toBe(' ');
      expect(buffer.get(0, 1)?.char).toBe(' ');
      expect(buffer.get(0, 0)?.bg).toEqual({r: 34, g: 34, b: 34});
    });

    it('paints overlapping boxes in ascending z-index order', () => {
      const buffer = new CellBuffer(6, 4);
      const lower = createBox({
        x: 1,
        y: 1,
        width: 3,
        height: 2,
        contentX: 1,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 2,
        computedStyle: style({'background-color': '#ff0000'}),
        zIndex: 1,
      });
      const higher = createBox({
        x: 2,
        y: 1,
        width: 3,
        height: 2,
        contentX: 2,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 2,
        computedStyle: style({'background-color': '#0000ff'}),
        zIndex: 2,
      });

      painter.paint([higher, lower], buffer);

      expect(buffer.get(2, 1)?.bg).toEqual({r: 0, g: 0, b: 255});
      expect(buffer.get(1, 1)?.bg).toEqual({r: 255, g: 0, b: 0});
    });

    it('uses document order as the tiebreaker for equal z-index values', () => {
      const buffer = new CellBuffer(6, 4);
      const earlier = createBox({
        x: 1,
        y: 1,
        width: 3,
        height: 2,
        contentX: 1,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 2,
        computedStyle: style({'background-color': '#00ff00'}),
        zIndex: 3,
      });
      const later = createBox({
        x: 2,
        y: 1,
        width: 3,
        height: 2,
        contentX: 2,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 2,
        computedStyle: style({'background-color': '#ffff00'}),
        zIndex: 3,
      });

      painter.paint([earlier, later], buffer);

      expect(buffer.get(2, 1)?.bg).toEqual({r: 255, g: 255, b: 0});
    });
  });

  describe('text painting', () => {
    it('writes text into the content area with styling attributes', () => {
      const buffer = new CellBuffer(10, 4);
      const box = createBox({
        x: 1,
        y: 1,
        width: 8,
        height: 2,
        contentX: 2,
        contentY: 1,
        contentWidth: 5,
        contentHeight: 1,
        textLines: ['hello'],
        computedStyle: style({
          color: '#abcdef',
          'background-color': '#112233',
          'font-weight': 'bold',
          'font-style': 'italic',
          'text-decoration': 'underline line-through',
          'text-decoration-style': 'double',
          'text-decoration-color': 'rgb(1, 2, 3)',
          opacity: '0.4',
        }),
      });

      painter.paint(box, buffer);

      expect(buffer.get(2, 1)).toEqual({
        char: 'h',
        fg: {r: 171, g: 205, b: 239},
        bg: {r: 17, g: 34, b: 51},
        bold: true,
        italic: true,
        underline: 'double',
        underlineColor: {r: 1, g: 2, b: 3},
        strikethrough: true,
        faint: true,
        hyperlink: null,
      });
      expect(buffer.get(6, 1)?.char).toBe('o');
    });

    it('clips text to the content width and height', () => {
      const buffer = new CellBuffer(8, 4);
      const box = createBox({
        contentX: 1,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 1,
        textLines: ['hello', 'world'],
        computedStyle: style({color: 'blue'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(1, 1)?.char).toBe('h');
      expect(buffer.get(3, 1)?.char).toBe('l');
      expect(buffer.get(4, 1)?.char).toBe(' ');
      expect(buffer.get(1, 2)?.char).toBe(' ');
    });
  });

  describe('text alignment', () => {
    it('centers text horizontally when text-align is center', () => {
      const buffer = new CellBuffer(10, 4);
      const box = createBox({
        contentX: 1,
        contentY: 1,
        contentWidth: 8,
        contentHeight: 1,
        textLines: ['hi'],
        computedStyle: style({'text-align': 'center'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(4, 1)?.char).toBe('h');
      expect(buffer.get(5, 1)?.char).toBe('i');
    });

    it('bottom-aligns text vertically when vertical-align is bottom', () => {
      const buffer = new CellBuffer(8, 6);
      const box = createBox({
        contentX: 1,
        contentY: 1,
        contentWidth: 4,
        contentHeight: 3,
        textLines: ['hi'],
        computedStyle: style({'vertical-align': 'bottom'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(1, 3)?.char).toBe('h');
      expect(buffer.get(2, 3)?.char).toBe('i');
    });
  });

  describe('overflow clipping', () => {
    it('clips text to the content area when overflow is hidden', () => {
      const buffer = new CellBuffer(8, 4);
      const box = createBox({
        x: 0,
        y: 0,
        width: 6,
        height: 3,
        contentX: 1,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 1,
        textLines: ['hello'],
        computedStyle: style({overflow: 'hidden'}),
      });

      painter.paint(box, buffer);

      expect(buffer.get(1, 1)?.char).toBe('h');
      expect(buffer.get(2, 1)?.char).toBe('e');
      expect(buffer.get(3, 1)?.char).toBe(' ');
    });

    it('intersects nested overflow clipping regions', () => {
      const buffer = new CellBuffer(8, 5);
      const child = createBox({
        x: 1,
        y: 1,
        width: 4,
        height: 2,
        contentX: 2,
        contentY: 1,
        contentWidth: 3,
        contentHeight: 1,
        textLines: ['xyz'],
        computedStyle: style({overflow: 'hidden'}),
      });
      const parent = createBox({
        x: 0,
        y: 0,
        width: 3,
        height: 3,
        contentX: 0,
        contentY: 0,
        contentWidth: 2,
        contentHeight: 2,
        computedStyle: style({overflow: 'hidden'}),
        children: [child],
      });

      painter.paint(parent, buffer);

      expect(buffer.get(2, 1)?.char).toBe(' ');
    });
  });

  describe('paint order', () => {
    it('paints children after their parent so they can overwrite cells', () => {
      const buffer = new CellBuffer(8, 4);
      const child = createBox({
        x: 2,
        y: 1,
        width: 2,
        height: 1,
        contentX: 2,
        contentY: 1,
        contentWidth: 2,
        contentHeight: 1,
        textLines: ['X'],
        computedStyle: style({color: '#ffffff'}),
      });
      const parent = createBox({
        x: 0,
        y: 0,
        width: 6,
        height: 3,
        contentX: 0,
        contentY: 0,
        contentWidth: 6,
        contentHeight: 3,
        textLines: ['parent'],
        computedStyle: style({color: '#000000', 'background-color': '#ff0000'}),
        children: [child],
      });

      painter.paint(parent, buffer);

      expect(buffer.get(2, 1)?.char).toBe('X');
      expect(buffer.get(2, 1)?.fg).toEqual({r: 255, g: 255, b: 255});
    });
  });
});
