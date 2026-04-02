import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('ParentNode', () => {
  describe('appendChild', () => {
    it('appends a child element', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(parent.firstChild).toBe(child);
      expect(parent.childNodes.length).toBe(1);
    });

    it('moves child from previous parent', () => {
      const {document} = createEnv();
      const parent1 = document.createElement('div');
      const parent2 = document.createElement('div');
      const child = document.createElement('span');
      parent1.appendChild(child);
      parent2.appendChild(child);
      expect(parent1.childNodes.length).toBe(0);
      expect(parent2.childNodes.length).toBe(1);
      expect(child.parentNode).toBe(parent2);
    });

    it('appends multiple children in order', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('a');
      const b = document.createElement('b');
      const c = document.createElement('c');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);
      expect(parent.childNodes[0]).toBe(a);
      expect(parent.childNodes[1]).toBe(b);
      expect(parent.childNodes[2]).toBe(c);
      expect(parent.firstChild).toBe(a);
      expect(parent.lastChild).toBe(c);
    });
  });

  describe('insertBefore', () => {
    it('inserts before a reference node', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      const inserted = document.createElement('p');
      parent.appendChild(existing);
      parent.insertBefore(inserted, existing);
      expect(parent.firstChild).toBe(inserted);
      expect(parent.childNodes[0]).toBe(inserted);
      expect(parent.childNodes[1]).toBe(existing);
    });

    it('appends when reference is null', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      const inserted = document.createElement('p');
      parent.appendChild(existing);
      parent.insertBefore(inserted, null);
      expect(parent.lastChild).toBe(inserted);
    });

    it('throws when reference node is not a child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const ref = document.createElement('p');
      expect(() => parent.insertBefore(child, ref)).toThrow();
    });
  });

  describe('removeChild', () => {
    it('removes a child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      parent.removeChild(child);
      expect(parent.childNodes.length).toBe(0);
      expect(child.parentNode).toBeNull();
    });

    it('updates sibling links after removal', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('a');
      const b = document.createElement('b');
      const c = document.createElement('c');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);
      parent.removeChild(b);
      expect(a.nextSibling).toBe(c);
      expect(c.previousSibling).toBe(a);
      expect(parent.childNodes.length).toBe(2);
    });

    it('throws when child is not a child of this node', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const notChild = document.createElement('span');
      expect(() => parent.removeChild(notChild)).toThrow();
    });

    it('removes from children array for element nodes', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(parent.children.length).toBe(1);
      parent.removeChild(child);
      expect(parent.children.length).toBe(0);
    });
  });

  describe('replaceChild', () => {
    it('replaces an existing child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const old = document.createElement('span');
      const replacement = document.createElement('p');
      parent.appendChild(old);
      parent.replaceChild(replacement, old);
      expect(parent.firstChild).toBe(replacement);
      expect(parent.childNodes.length).toBe(1);
      expect(old.parentNode).toBeNull();
    });
  });

  describe('append', () => {
    it('appends multiple nodes and strings', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.append(child, 'text');
      expect(parent.childNodes.length).toBe(2);
      expect(parent.firstChild).toBe(child);
      expect(parent.lastChild?.nodeType).toBe(3); // TEXT_NODE
      expect(parent.lastChild?.textContent).toBe('text');
    });
  });

  describe('prepend', () => {
    it('prepends before existing children', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      const prepended = document.createElement('p');
      parent.appendChild(existing);
      parent.prepend(prepended);
      expect(parent.firstChild).toBe(prepended);
      expect(parent.childNodes[1]).toBe(existing);
    });
  });

  describe('replaceChildren', () => {
    it('replaces all children', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createElement('p'));
      const replacement = document.createElement('a');
      parent.replaceChildren(replacement);
      expect(parent.childNodes.length).toBe(1);
      expect(parent.firstChild).toBe(replacement);
    });

    it('clears all children when called with no args', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.replaceChildren();
      expect(parent.childNodes.length).toBe(0);
    });
  });

  describe('DocumentFragment insertion', () => {
    it('inserts all fragment children into parent', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createElement('span'));
      fragment.appendChild(document.createElement('p'));
      parent.appendChild(fragment);
      expect(parent.childNodes.length).toBe(2);
      expect(parent.firstChild?.nodeName).toBe('SPAN');
      expect(parent.lastChild?.nodeName).toBe('P');
    });
  });

  describe('querySelector / querySelectorAll', () => {
    it('finds element by tag name', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(parent.querySelector('span')).toBe(child);
    });

    it('finds all matching elements', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createElement('p'));
      const spans = parent.querySelectorAll('span');
      expect(spans.length).toBe(2);
    });

    it('finds by class', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      child.setAttribute('class', 'foo');
      parent.appendChild(child);
      expect(parent.querySelector('.foo')).toBe(child);
    });

    it('finds by id', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      child.setAttribute('id', 'bar');
      parent.appendChild(child);
      expect(parent.querySelector('#bar')).toBe(child);
    });

    it('returns null when no match', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      expect(parent.querySelector('span')).toBeNull();
    });

    it('returns empty NodeList when no matches', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      expect(parent.querySelectorAll('span').length).toBe(0);
    });

    it('finds nested descendants', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('div');
      const grandchild = document.createElement('span');
      child.appendChild(grandchild);
      parent.appendChild(child);
      expect(parent.querySelector('span')).toBe(grandchild);
    });

    it('finds with descendant combinator', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('section');
      const grandchild = document.createElement('p');
      child.appendChild(grandchild);
      parent.appendChild(child);
      const result = parent.querySelectorAll('section p');
      expect(result.length).toBe(1);
      expect(result[0]).toBe(grandchild);
    });

    it('finds with child combinator', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('section');
      const grandchild = document.createElement('p');
      child.appendChild(grandchild);
      parent.appendChild(child);
      expect(parent.querySelectorAll('div > p').length).toBe(0);
      expect(parent.querySelectorAll('section > p').length).toBe(1);
    });
  });
});
