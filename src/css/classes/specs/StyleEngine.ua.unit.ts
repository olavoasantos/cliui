import {describe, expect, it} from 'vitest';

import {StyleEngine} from '../StyleEngine';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();

  engine.attach(document);

  return {window, document, engine};
}

describe('StyleEngine — user-agent stylesheet', () => {
  describe('injection', () => {
    it('injects a UA style element into head on attach', () => {
      const {document} = createEnv();
      const ua = document.head.querySelector('[data-ua-stylesheet]');

      expect(ua).not.toBeNull();
      expect(ua!.textContent!.length).toBeGreaterThan(0);
    });

    it('places the UA style element as the first child of head', () => {
      const window = new Window();
      const document = window.document;

      // Add a user style first
      const userStyle = document.createElement('style');
      userStyle.textContent = 'div { color: red; }';
      document.head.appendChild(userStyle);

      const engine = new StyleEngine();
      engine.attach(document);

      expect(document.head.firstChild).toBe(document.head.querySelector('[data-ua-stylesheet]'));
    });

    it('does not inject twice on re-attach', () => {
      const window = new Window();
      const document = window.document;
      const engine = new StyleEngine();

      engine.attach(document);
      engine.detach();
      engine.attach(document);

      const uaElements = document.head.querySelectorAll('[data-ua-stylesheet]');

      expect(uaElements.length).toBe(1);
    });
  });

  describe('block-level defaults', () => {
    it('applies display: block to heading elements', () => {
      const {document, engine} = createEnv();

      for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);
        const computed = engine.getComputedStyle(el);

        expect(computed.get('display')).toBe('block');
      }
    });

    it('applies font-weight: bold to heading elements', () => {
      const {document, engine} = createEnv();

      for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);

        expect(engine.getComputedStyle(el).get('font-weight')).toBe('bold');
      }
    });

    it('applies display: block to p, blockquote, pre, div', () => {
      const {document, engine} = createEnv();

      for (const tag of ['p', 'blockquote', 'pre', 'div']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);

        expect(engine.getComputedStyle(el).get('display')).toBe('block');
      }
    });

    it('applies display: block and padding-left to ul and ol', () => {
      const {document, engine} = createEnv();

      for (const tag of ['ul', 'ol']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);
        const computed = engine.getComputedStyle(el);

        expect(computed.get('display')).toBe('block');
        expect(computed.get('padding-left')).toBe('2');
      }
    });

    it('applies white-space: pre to pre elements', () => {
      const {document, engine} = createEnv();
      const pre = document.createElement('pre');
      document.body.appendChild(pre);

      expect(engine.getComputedStyle(pre).get('white-space')).toBe('pre');
    });

    it('applies height: 1 and block display to hr', () => {
      const {document, engine} = createEnv();
      const hr = document.createElement('hr');
      document.body.appendChild(hr);
      const computed = engine.getComputedStyle(hr);

      expect(computed.get('display')).toBe('block');
      expect(computed.get('height')).toBe('1');
    });
  });

  describe('inline defaults', () => {
    it('applies display: inline to inline elements', () => {
      const {document, engine} = createEnv();

      for (const tag of ['span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'mark']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);

        expect(engine.getComputedStyle(el).get('display')).toBe('inline');
      }
    });
  });

  describe('text styling defaults', () => {
    it('applies font-weight: bold to strong and b', () => {
      const {document, engine} = createEnv();

      for (const tag of ['strong', 'b']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);

        expect(engine.getComputedStyle(el).get('font-weight')).toBe('bold');
      }
    });

    it('applies font-style: italic to em and i', () => {
      const {document, engine} = createEnv();

      for (const tag of ['em', 'i']) {
        const el = document.createElement(tag);
        document.body.appendChild(el);

        expect(engine.getComputedStyle(el).get('font-style')).toBe('italic');
      }
    });

    it('applies text-decoration: underline to u', () => {
      const {document, engine} = createEnv();
      const u = document.createElement('u');
      document.body.appendChild(u);

      expect(engine.getComputedStyle(u).get('text-decoration')).toBe('underline');
    });

    it('applies text-decoration: line-through to s', () => {
      const {document, engine} = createEnv();
      const s = document.createElement('s');
      document.body.appendChild(s);

      expect(engine.getComputedStyle(s).get('text-decoration')).toBe('line-through');
    });

    it('applies underline and link color to a', () => {
      const {document, engine} = createEnv();
      const a = document.createElement('a');
      document.body.appendChild(a);
      const computed = engine.getComputedStyle(a);

      expect(computed.get('text-decoration')).toBe('underline');
      expect(computed.get('color')).toBe('#5f87ff');
    });

    it('applies highlight colors to mark', () => {
      const {document, engine} = createEnv();
      const mark = document.createElement('mark');
      document.body.appendChild(mark);
      const computed = engine.getComputedStyle(mark);

      expect(computed.get('background-color')).toBe('#ffff00');
      expect(computed.get('color')).toBe('#000000');
    });
  });

  describe('override behavior', () => {
    it('user stylesheet overrides UA defaults', () => {
      const {document, engine} = createEnv();

      const style = document.createElement('style');
      style.textContent = 'strong { font-weight: normal; }';
      document.head.appendChild(style);

      const strong = document.createElement('strong');
      document.body.appendChild(strong);

      expect(engine.getComputedStyle(strong).get('font-weight')).toBe('normal');
    });

    it('inline styles override UA defaults', () => {
      const {document, engine} = createEnv();
      const h1 = document.createElement('h1');
      h1.style.fontWeight = 'normal';
      document.body.appendChild(h1);

      expect(engine.getComputedStyle(h1).get('font-weight')).toBe('normal');
    });
  });
});
