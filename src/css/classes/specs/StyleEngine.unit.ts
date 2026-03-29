import {describe, it, expect, vi} from 'vitest';

import {HOOKS} from '../../../dom/constants';
import {StyleEngine} from '../StyleEngine';
import {Window} from '../../../dom/classes/Window';

import type {Hooks} from '../../../dom/types';

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

  describe('dirty tracking', () => {
    describe('markStyleDirty', () => {
      it('adds an element to the style-dirty set', () => {
        const {document, engine} = createEnv();
        const div = document.createElement('div');
        document.body.appendChild(div);

        engine.markStyleDirty(div);

        expect(engine.getDirtyElements().has(div)).toBe(true);
      });

      it('does not duplicate elements in the dirty set', () => {
        const {document, engine} = createEnv();
        const div = document.createElement('div');
        document.body.appendChild(div);

        engine.clearDirty();
        engine.markStyleDirty(div);
        engine.markStyleDirty(div);

        expect(engine.getDirtyElements().size).toBe(1);
      });
    });

    describe('markAllDirty', () => {
      it('marks every element in the tree as style-dirty', () => {
        const {document, engine} = createEnv();
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        document.body.appendChild(parent);

        engine.markAllDirty();

        const dirty = engine.getDirtyElements();
        expect(dirty.has(document.body)).toBe(true);
        expect(dirty.has(parent)).toBe(true);
        expect(dirty.has(child)).toBe(true);
      });
    });

    describe('clearDirty', () => {
      it('clears both style-dirty and layout-dirty sets', () => {
        const {document, engine} = createEnv();
        const div = document.createElement('div');
        div.style.display = 'flex';
        document.body.appendChild(div);

        engine.computeAll();
        engine.markStyleDirty(div);
        div.style.display = 'block';
        engine.recomputeDirty();

        expect(engine.getLayoutDirtyElements().size).toBeGreaterThan(0);

        engine.clearDirty();

        expect(engine.getDirtyElements().size).toBe(0);
        expect(engine.getLayoutDirtyElements().size).toBe(0);
      });
    });
  });

  describe('recomputeDirty', () => {
    it('recomputes only dirty elements', () => {
      const {document, engine} = createEnv();
      const style = document.createElement('style');
      style.textContent = '.a { color: red; } .b { color: green; }';
      document.head.appendChild(style);

      const divA = document.createElement('div');
      divA.setAttribute('class', 'a');
      const divB = document.createElement('div');
      divB.setAttribute('class', 'b');
      document.body.appendChild(divA);
      document.body.appendChild(divB);

      // Initial computation
      engine.computeAll();
      const originalStyleB = engine.getComputedStyle(divB);

      // Change divA's inline style, then clear all dirty marks and
      // manually mark only divA so we can verify scoped recomputation
      divA.style.color = 'purple';
      engine.clearDirty();
      engine.markStyleDirty(divA);
      engine.recomputeDirty();

      // divA should have updated style (inline overrides stylesheet)
      expect(engine.getComputedStyle(divA).get('color')).toBe('purple');
      // divB should still return the cached style (same reference)
      expect(engine.getComputedStyle(divB)).toBe(originalStyleB);
    });

    it('clears style-dirty set after recomputation', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.markStyleDirty(div);
      engine.recomputeDirty();

      expect(engine.getDirtyElements().size).toBe(0);
    });

    it('recomputes children of dirty elements for inheritance', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      parent.style.color = 'red';
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      engine.computeAll();
      expect(engine.getComputedStyle(child).get('color')).toBe('red');

      // Change parent color - only mark parent dirty
      parent.style.color = 'blue';
      engine.markStyleDirty(parent);
      engine.recomputeDirty();

      expect(engine.getComputedStyle(child).get('color')).toBe('blue');
    });
  });

  describe('layout-dirty flags', () => {
    it('marks elements layout-dirty when layout properties change', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.display = 'flex';
      document.body.appendChild(div);

      engine.computeAll();

      div.style.display = 'block';
      engine.markStyleDirty(div);
      engine.recomputeDirty();

      expect(engine.getLayoutDirtyElements().has(div)).toBe(true);
    });

    it('does not mark layout-dirty when only non-layout properties change', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.color = 'red';
      document.body.appendChild(div);

      engine.computeAll();

      div.style.color = 'blue';
      engine.markStyleDirty(div);
      engine.recomputeDirty();

      expect(engine.getLayoutDirtyElements().has(div)).toBe(false);
    });

    it('marks layout-dirty when padding changes', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.padding = '1';
      document.body.appendChild(div);

      engine.computeAll();

      div.style.padding = '2';
      engine.markStyleDirty(div);
      engine.recomputeDirty();

      expect(engine.getLayoutDirtyElements().has(div)).toBe(true);
    });

    it('marks children layout-dirty when inherited layout values change', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      parent.style.textAlign = 'left';
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      engine.computeAll();

      parent.style.textAlign = 'center';
      engine.markStyleDirty(parent);
      engine.recomputeDirty();

      expect(engine.getLayoutDirtyElements().has(child)).toBe(true);
    });

    it('clears layout-dirty on each recomputeDirty call', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.display = 'flex';
      document.body.appendChild(div);

      engine.computeAll();

      div.style.display = 'block';
      engine.markStyleDirty(div);
      engine.recomputeDirty();
      expect(engine.getLayoutDirtyElements().has(div)).toBe(true);

      // Second recompute with no new dirty elements
      engine.recomputeDirty();
      expect(engine.getLayoutDirtyElements().size).toBe(0);
    });

    it('marks newly computed elements as layout-dirty', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.style.display = 'flex';
      document.body.appendChild(div);

      // Mark dirty without prior cache - should be layout-dirty
      engine.markStyleDirty(div);
      engine.recomputeDirty();

      expect(engine.getLayoutDirtyElements().has(div)).toBe(true);
    });
  });

  describe('attach and hooks bridge integration', () => {
    it('wires hooks while preserving any previously registered hook handlers', () => {
      const window = new Window();
      const previousSetAttribute = vi.fn<Hooks['setAttribute']>();
      const previousRemoveAttribute = vi.fn<Hooks['removeAttribute']>();
      const previousInsertChild = vi.fn<Hooks['insertChild']>();
      const previousRemoveChild = vi.fn<Hooks['removeChild']>();
      const previousSetText = vi.fn<Hooks['setText']>();
      const previousFocusChange = vi.fn<Hooks['focusChange']>();
      const hooks = window[HOOKS] as Partial<Hooks>;

      hooks.setAttribute = previousSetAttribute;
      hooks.removeAttribute = previousRemoveAttribute;
      hooks.insertChild = previousInsertChild;
      hooks.removeChild = previousRemoveChild;
      hooks.setText = previousSetText;
      hooks.focusChange = previousFocusChange;

      const engine = new StyleEngine();
      engine.attach(window.document);

      const parent = window.document.createElement('div');
      const child = window.document.createElement('span');
      const text = window.document.createTextNode('hello');

      window.document.body.appendChild(parent);
      engine.clearDirty();
      parent.setAttribute('class', 'shell');
      parent.appendChild(child);
      child.appendChild(text);
      text.data = 'updated';
      parent.removeChild(child);
      parent.removeAttribute('class');
      window.document.setActiveElement(parent);

      expect(previousSetAttribute).toHaveBeenCalled();
      expect(previousInsertChild).toHaveBeenCalled();
      expect(previousSetText).toHaveBeenCalled();
      expect(previousRemoveChild).toHaveBeenCalled();
      expect(previousRemoveAttribute).toHaveBeenCalled();
      expect(previousFocusChange).toHaveBeenCalled();
      expect(engine.getDirtyElements().has(parent)).toBe(true);
      expect(engine.getLayoutDirtyElements().has(parent)).toBe(true);
    });

    it('restores previous hook handlers on detach', () => {
      const window = new Window();
      const hooks = window[HOOKS] as Partial<Hooks>;
      const originalSetAttribute = vi.fn<Hooks['setAttribute']>();
      const originalRemoveAttribute = vi.fn<Hooks['removeAttribute']>();
      const originalInsertChild = vi.fn<Hooks['insertChild']>();
      const originalRemoveChild = vi.fn<Hooks['removeChild']>();
      const originalSetText = vi.fn<Hooks['setText']>();
      const originalFocusChange = vi.fn<Hooks['focusChange']>();

      hooks.setAttribute = originalSetAttribute;
      hooks.removeAttribute = originalRemoveAttribute;
      hooks.insertChild = originalInsertChild;
      hooks.removeChild = originalRemoveChild;
      hooks.setText = originalSetText;
      hooks.focusChange = originalFocusChange;

      const engine = new StyleEngine();
      engine.attach(window.document);
      engine.detach();

      expect(hooks.setAttribute).toBe(originalSetAttribute);
      expect(hooks.removeAttribute).toBe(originalRemoveAttribute);
      expect(hooks.insertChild).toBe(originalInsertChild);
      expect(hooks.removeChild).toBe(originalRemoveChild);
      expect(hooks.setText).toBe(originalSetText);
      expect(hooks.focusChange).toBe(originalFocusChange);
    });

    it('marks element style-dirty on setAttribute', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.clearDirty();
      div.setAttribute('class', 'foo');

      expect(engine.getDirtyElements().has(div)).toBe(true);
    });

    it('marks element and descendants dirty on class change', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      engine.clearDirty();
      parent.setAttribute('class', 'container');

      expect(engine.getDirtyElements().has(parent)).toBe(true);
      expect(engine.getDirtyElements().has(child)).toBe(true);
    });

    it('marks element dirty on removeAttribute', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      div.setAttribute('id', 'main');
      document.body.appendChild(div);

      engine.clearDirty();
      div.removeAttribute('id');

      expect(engine.getDirtyElements().has(div)).toBe(true);
    });

    it('marks inserted element and parent dirty on insertChild', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      engine.clearDirty();
      const child = document.createElement('span');
      parent.appendChild(child);

      expect(engine.getDirtyElements().has(child)).toBe(true);
      expect(engine.getDirtyElements().has(parent)).toBe(true);
    });

    it('marks parent and remaining children dirty on removeChild', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('span');
      parent.appendChild(child1);
      parent.appendChild(child2);
      document.body.appendChild(parent);

      engine.clearDirty();
      parent.removeChild(child1);

      expect(engine.getDirtyElements().has(parent)).toBe(true);
      expect(engine.getDirtyElements().has(child2)).toBe(true);
    });

    it('marks element dirty on attribute change for selector matching', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.clearDirty();
      div.setAttribute('data-active', 'true');

      expect(engine.getDirtyElements().has(div)).toBe(true);
    });

    it('marks previous and next active elements dirty on focus change', () => {
      const {document, engine} = createEnv();
      const first = document.createElement('button');
      const second = document.createElement('button');
      document.body.appendChild(first);
      document.body.appendChild(second);

      engine.clearDirty();
      document.setActiveElement(first);

      expect(engine.getDirtyElements().has(document.body)).toBe(true);
      expect(engine.getDirtyElements().has(first)).toBe(true);

      engine.clearDirty();
      document.setActiveElement(second);

      expect(engine.getDirtyElements().has(first)).toBe(true);
      expect(engine.getDirtyElements().has(second)).toBe(true);
    });

    it('marks the parent layout-dirty when text content changes', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      const text = document.createTextNode('alpha');
      div.appendChild(text);
      document.body.appendChild(div);

      engine.clearDirty();
      text.data = 'beta gamma';

      expect(engine.getLayoutDirtyElements().has(div)).toBe(true);
    });

    it('marks the parent layout-dirty when children are inserted or removed', () => {
      const {document, engine} = createEnv();
      const parent = document.createElement('div');
      document.body.appendChild(parent);
      const child = document.createTextNode('hello');

      engine.clearDirty();
      parent.appendChild(child);
      expect(engine.getLayoutDirtyElements().has(parent)).toBe(true);

      engine.clearDirty();
      parent.removeChild(child);
      expect(engine.getLayoutDirtyElements().has(parent)).toBe(true);
    });
  });

  describe('detach', () => {
    it('clears dirty sets on detach', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.markStyleDirty(div);
      engine.detach();

      expect(engine.getDirtyElements().size).toBe(0);
      expect(engine.getLayoutDirtyElements().size).toBe(0);
    });

    it('stops receiving hook notifications after detach', () => {
      const {document, engine} = createEnv();
      const div = document.createElement('div');
      document.body.appendChild(div);

      engine.detach();
      engine.clearDirty();

      div.setAttribute('class', 'foo');

      expect(engine.getDirtyElements().size).toBe(0);
    });
  });
});
