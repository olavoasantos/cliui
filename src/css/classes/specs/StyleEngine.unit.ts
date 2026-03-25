import {describe, it, expect} from 'vitest';

import {StyleEngine} from '../StyleEngine';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();
  engine.attach(document);
  return {window, document, engine};
}

describe('StyleEngine', () => {
  describe('inline styles only', () => {
    it('computes inline style for an element', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.color = 'red';
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('red');
    });

    it('computes multiple inline properties', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.color = 'red';
      div.style.fontWeight = 'bold';
      div.style.padding = '1 2';
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('red');
      expect(computed.get('font-weight')).toBe('bold');
      expect(computed.get('padding-top')).toBe('1');
      expect(computed.get('padding-left')).toBe('2');
    });
  });

  describe('style elements', () => {
    it('applies rules from a style element in head', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = 'div { color: blue; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('blue');
    });

    it('applies class-based selectors from style elements', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = '.container { padding: 2; border-style: rounded; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.setAttribute('class', 'container');
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('padding-top')).toBe('2');
      expect(computed.get('padding-right')).toBe('2');
      expect(computed.get('border-style')).toBe('rounded');
    });

    it('applies id-based selectors', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = '#main { color: green; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.setAttribute('id', 'main');
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('green');
    });
  });

  describe('inline styles override stylesheet rules', () => {
    it('inline style takes priority over id selector', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = '#main { color: blue; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.setAttribute('id', 'main');
      div.style.color = 'red';
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('red');
    });
  });

  describe('inheritance', () => {
    it('child inherits color from parent', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      parent.style.color = '#7c3aed';
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const computed = engine.getComputedStyle(child);

      expect(computed.get('color')).toBe('#7c3aed');
    });

    it('child inherits from stylesheet rules on parent', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = '.parent { color: blue; font-weight: bold; }';
      document.head.appendChild(style);

      const parent = document.createElement('div');
      parent.setAttribute('class', 'parent');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const computed = engine.getComputedStyle(child);

      expect(computed.get('color')).toBe('blue');
      expect(computed.get('font-weight')).toBe('bold');
    });

    it('deep inheritance chain works', () => {
      const {document, engine} = createEnv();
      const grandparent = document.createElement('div');
      grandparent.style.color = 'red';
      const parent = document.createElement('div');
      const child = document.createElement('span');
      grandparent.appendChild(parent);
      parent.appendChild(child);
      document.body.appendChild(grandparent);

      const computed = engine.getComputedStyle(child);

      expect(computed.get('color')).toBe('red');
    });

    it('non-inheritable properties do not inherit', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      parent.style.padding = '2';
      parent.style.display = 'flex';
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const computed = engine.getComputedStyle(child);

      expect(computed.has('padding-top')).toBe(false);
      expect(computed.has('display')).toBe(false);
    });
  });

  describe('computeAll', () => {
    it('computes styles for the entire tree', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = `
        .container { color: blue; }
        .title { font-weight: bold; }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.setAttribute('class', 'container');
      const title = document.createElement('span');
      title.setAttribute('class', 'title');
      container.appendChild(title);
      document.body.appendChild(container);

      engine.computeAll();

      const containerStyle = engine.getComputedStyle(container);
      const titleStyle = engine.getComputedStyle(title);

      expect(containerStyle.get('color')).toBe('blue');
      expect(titleStyle.get('font-weight')).toBe('bold');
      // title inherits color from container
      expect(titleStyle.get('color')).toBe('blue');
    });
  });

  describe('caching', () => {
    it('returns cached computed style on repeated calls', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.color = 'red';
      document.body.appendChild(div);

      const first = engine.getComputedStyle(div);
      const second = engine.getComputedStyle(div);

      expect(first).toBe(second);
    });

    it('invalidateElement clears cache for that element', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.color = 'red';
      document.body.appendChild(div);

      const first = engine.getComputedStyle(div);
      engine.invalidateElement(div);
      div.style.color = 'blue';
      const second = engine.getComputedStyle(div);

      expect(first).not.toBe(second);
      expect(second.get('color')).toBe('blue');
    });

    it('invalidateSubtree clears cache for element and descendants', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      parent.style.color = 'red';
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      engine.getComputedStyle(parent);
      engine.getComputedStyle(child);

      engine.invalidateSubtree(parent);
      parent.style.color = 'blue';

      const parentStyle = engine.getComputedStyle(parent);
      const childStyle = engine.getComputedStyle(child);

      expect(parentStyle.get('color')).toBe('blue');
      expect(childStyle.get('color')).toBe('blue');
    });

    it('invalidateStylesheets causes re-parsing', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = 'div { color: red; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.getComputedStyle(div);
      engine.invalidateStylesheets();
      engine.invalidateElement(div);

      style.textContent = 'div { color: blue; }';

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('blue');
    });
  });

  describe('multiple style elements', () => {
    it('combines rules from multiple style elements', () => {
      const {document, engine} = createEnv();
      const style1 = document.createElement('style');
      style1.textContent = '.a { color: red; }';
      document.head.appendChild(style1);

      const style2 = document.createElement('style');
      style2.textContent = '.b { font-weight: bold; }';
      document.head.appendChild(style2);

      const div = document.createElement('div');
      div.setAttribute('class', 'a b');
      document.body.appendChild(div);

      const computed = engine.getComputedStyle(div);

      expect(computed.get('color')).toBe('red');
      expect(computed.get('font-weight')).toBe('bold');
    });
  });

  describe('real-world scenario', () => {
    it('handles a typical terminal-dom setup', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = `
        .container {
          display: flex;
          flex-direction: column;
          padding: 1;
          border-style: rounded;
          border-color: #7c3aed;
        }
        .title {
          font-weight: bold;
          color: #7c3aed;
        }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.setAttribute('class', 'container');
      const title = document.createElement('span');
      title.setAttribute('class', 'title');
      title.textContent = 'Hello, Terminal!';
      container.appendChild(title);
      document.body.appendChild(container);

      const containerStyle = engine.getComputedStyle(container);

      expect(containerStyle.get('display')).toBe('flex');
      expect(containerStyle.get('flex-direction')).toBe('column');
      expect(containerStyle.get('padding-top')).toBe('1');
      expect(containerStyle.get('border-style')).toBe('rounded');
      expect(containerStyle.get('border-color')).toBe('#7c3aed');

      const titleStyle = engine.getComputedStyle(title);

      expect(titleStyle.get('font-weight')).toBe('bold');
      expect(titleStyle.get('color')).toBe('#7c3aed');
    });
  });
});
