import {describe, it, expect, vi} from 'vitest';
import {Window} from '../Window';
import {HOOKS} from '../../constants';
import type {Hooks} from '../../types';

function createEnv(hooks: Partial<Hooks> = {}) {
  const window = new Window();
  window[HOOKS] = hooks;
  return {window, document: window.document};
}

describe('hooks bridge', () => {
  describe('createElement', () => {
    it('fires when creating an element', () => {
      const createElement = vi.fn();
      const {document} = createEnv({createElement});
      document.createElement('div');
      expect(createElement).toHaveBeenCalledOnce();
      expect(createElement.mock.calls[0][0].localName).toBe('div');
    });

    it('passes namespace for createElementNS', () => {
      const createElement = vi.fn();
      const {document} = createEnv({createElement});
      document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      expect(createElement).toHaveBeenCalledWith(
        expect.objectContaining({localName: 'circle'}),
        'http://www.w3.org/2000/svg',
      );
    });
  });

  describe('createText', () => {
    it('fires when creating a text node', () => {
      const createText = vi.fn();
      const {document} = createEnv({createText});
      document.createTextNode('hello');
      expect(createText).toHaveBeenCalledOnce();
      expect(createText.mock.calls[0][1]).toBe('hello');
    });
  });

  describe('setText', () => {
    it('fires when text data changes', () => {
      const setText = vi.fn();
      const {document} = createEnv({setText});
      const text = document.createTextNode('hello');
      text.data = 'world';
      expect(setText).toHaveBeenCalledOnce();
      expect(setText.mock.calls[0][1]).toBe('world');
    });
  });

  describe('setAttribute', () => {
    it('fires when setting an attribute on an element', () => {
      const setAttribute = vi.fn();
      const {document} = createEnv({setAttribute});
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      expect(setAttribute).toHaveBeenCalledWith(el, 'id', 'test', null);
    });

    it('fires when updating an attribute value', () => {
      const setAttribute = vi.fn();
      const {document} = createEnv({setAttribute});
      const el = document.createElement('div');
      el.setAttribute('id', 'old');
      el.setAttribute('id', 'new');
      expect(setAttribute).toHaveBeenCalledTimes(2);
      expect(setAttribute.mock.calls[1]).toEqual([el, 'id', 'new', null]);
    });
  });

  describe('removeAttribute', () => {
    it('fires when removing an attribute', () => {
      const removeAttribute = vi.fn();
      const {document} = createEnv({removeAttribute});
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.removeAttribute('id');
      expect(removeAttribute).toHaveBeenCalledWith(el, 'id', null);
    });
  });

  describe('insertChild', () => {
    it('fires when appending a child to an element', () => {
      const insertChild = vi.fn();
      const {document} = createEnv({insertChild});
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(insertChild).toHaveBeenCalledWith(parent, child, 0);
    });

    it('fires with correct index for second child', () => {
      const insertChild = vi.fn();
      const {document} = createEnv({insertChild});
      const parent = document.createElement('div');
      const child1 = document.createElement('a');
      const child2 = document.createElement('b');
      parent.appendChild(child1);
      parent.appendChild(child2);
      expect(insertChild).toHaveBeenCalledTimes(2);
      expect(insertChild.mock.calls[1]).toEqual([parent, child2, 1]);
    });

    it('fires when inserting before a reference', () => {
      const insertChild = vi.fn();
      const {document} = createEnv({insertChild});
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      const inserted = document.createElement('p');
      parent.appendChild(existing);
      parent.insertBefore(inserted, existing);
      expect(insertChild).toHaveBeenCalledTimes(2);
      expect(insertChild.mock.calls[1]).toEqual([parent, inserted, 0]);
    });
  });

  describe('removeChild', () => {
    it('fires when removing a child from an element', () => {
      const removeChild = vi.fn();
      const {document} = createEnv({removeChild});
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      parent.removeChild(child);
      expect(removeChild).toHaveBeenCalledWith(parent, child, 0);
    });
  });

  describe('addEventListener / removeEventListener', () => {
    it('fires addEventListener hook', () => {
      const addEventListener = vi.fn();
      const {document} = createEnv({addEventListener});
      const el = document.createElement('div');
      const handler = () => {};
      el.addEventListener('click', handler);
      expect(addEventListener).toHaveBeenCalledWith(el, 'click', handler, undefined);
    });

    it('fires removeEventListener hook', () => {
      const removeEventListener = vi.fn();
      const {document} = createEnv({removeEventListener});
      const el = document.createElement('div');
      const handler = () => {};
      el.addEventListener('click', handler);
      el.removeEventListener('click', handler);
      expect(removeEventListener).toHaveBeenCalledWith(el, 'click', handler, undefined);
    });
  });

  describe('hooks not set', () => {
    it('works without hooks configured', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.appendChild(document.createTextNode('hello'));
      el.removeAttribute('id');
      expect(() => document.body.appendChild(el)).not.toThrow();
    });
  });
});
