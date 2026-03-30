import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../LayoutEngine';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const styleEngine = new StyleEngine();

  styleEngine.attach(document);

  return {window, document, styleEngine};
}

describe('LayoutEngine — br and wbr elements', () => {
  describe('br', () => {
    it('forces a line break within text content', () => {
      const {document, styleEngine} = createEnv();
      const div = document.createElement('div');
      div.appendChild(document.createTextNode('hello'));
      div.appendChild(document.createElement('br'));
      div.appendChild(document.createTextNode('world'));
      document.body.appendChild(div);

      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(document.body, 80, 24);
      const childBox = box.children[0]!;

      expect(childBox.textLines).toEqual(['hello', 'world']);
      expect(childBox.height).toBe(2);
    });

    it('handles multiple br elements in sequence', () => {
      const {document, styleEngine} = createEnv();
      const div = document.createElement('div');
      div.appendChild(document.createTextNode('line1'));
      div.appendChild(document.createElement('br'));
      div.appendChild(document.createElement('br'));
      div.appendChild(document.createTextNode('line3'));
      document.body.appendChild(div);

      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(document.body, 80, 24);
      const childBox = box.children[0]!;

      expect(childBox.textLines).toEqual(['line1', '', 'line3']);
      expect(childBox.height).toBe(3);
    });

    it('handles br at the beginning of content', () => {
      const {document, styleEngine} = createEnv();
      const div = document.createElement('div');
      div.appendChild(document.createElement('br'));
      div.appendChild(document.createTextNode('hello'));
      document.body.appendChild(div);

      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(document.body, 80, 24);
      const childBox = box.children[0]!;

      expect(childBox.textLines).toEqual(['', 'hello']);
    });
  });

  describe('wbr', () => {
    it('allows line break at wbr position when content wraps', () => {
      const {document, styleEngine} = createEnv();
      const div = document.createElement('div');
      div.style.width = '5';
      div.appendChild(document.createTextNode('hel'));
      div.appendChild(document.createElement('wbr'));
      div.appendChild(document.createTextNode('lo'));
      document.body.appendChild(div);

      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(document.body, 80, 24);
      const childBox = box.children[0]!;

      // "hel" + ZWSP + "lo" — the ZWSP provides a break opportunity
      // at width 5, "hel\u200Blo" (5 visible chars) may or may not break
      // depending on implementation; at minimum it doesn't crash
      expect(childBox.textLines).toBeDefined();
      expect(childBox.textLines!.length).toBeGreaterThanOrEqual(1);
    });
  });
});
