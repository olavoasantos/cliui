import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('ChildNode', () => {
  describe('remove', () => {
    it('removes itself from parent', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      child.remove();
      expect(parent.childNodes.length).toBe(0);
      expect(child.parentNode).toBeNull();
    });

    it('does nothing when no parent', () => {
      const {document} = createEnv();
      const child = document.createElement('span');
      expect(() => child.remove()).not.toThrow();
    });
  });

  describe('replaceWith', () => {
    it('replaces itself with another node', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const replacement = document.createElement('p');
      parent.appendChild(child);
      child.replaceWith(replacement);
      expect(parent.firstChild).toBe(replacement);
      expect(parent.childNodes.length).toBe(1);
    });

    it('replaces with multiple nodes', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      const a = document.createElement('a');
      const b = document.createElement('b');
      child.replaceWith(a, b);
      expect(parent.childNodes.length).toBe(2);
      expect(parent.childNodes[0]).toBe(a);
      expect(parent.childNodes[1]).toBe(b);
    });

    it('does nothing when no parent', () => {
      const {document} = createEnv();
      const child = document.createElement('span');
      const replacement = document.createElement('p');
      expect(() => child.replaceWith(replacement)).not.toThrow();
    });
  });

  describe('before', () => {
    it('inserts a node before itself', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const before = document.createElement('p');
      parent.appendChild(child);
      child.before(before);
      expect(parent.firstChild).toBe(before);
      expect(parent.childNodes[1]).toBe(child);
    });

    it('inserts a string as text node before itself', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      child.before('text');
      expect(parent.firstChild?.nodeType).toBe(3);
      expect(parent.firstChild?.textContent).toBe('text');
    });

    it('does nothing when no parent', () => {
      const {document} = createEnv();
      const child = document.createElement('span');
      expect(() => child.before(document.createElement('p'))).not.toThrow();
    });
  });

  describe('after', () => {
    it('inserts a node after itself', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const after = document.createElement('p');
      parent.appendChild(child);
      child.after(after);
      expect(parent.lastChild).toBe(after);
      expect(parent.childNodes[0]).toBe(child);
      expect(parent.childNodes[1]).toBe(after);
    });

    it('inserts between siblings', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('a');
      const c = document.createElement('c');
      const b = document.createElement('b');
      parent.appendChild(a);
      parent.appendChild(c);
      a.after(b);
      expect(parent.childNodes[0]).toBe(a);
      expect(parent.childNodes[1]).toBe(b);
      expect(parent.childNodes[2]).toBe(c);
    });

    it('does nothing when no parent', () => {
      const {document} = createEnv();
      const child = document.createElement('span');
      expect(() => child.after(document.createElement('p'))).not.toThrow();
    });
  });
});
