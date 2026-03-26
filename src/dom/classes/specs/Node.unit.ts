import {describe, it, expect} from 'vitest';
import {Window} from '../Window';
import type {Element} from '../Element';
import {NodeType} from '../../constants';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Node', () => {
  describe('properties', () => {
    it('has a nodeType', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.nodeType).toBe(NodeType.ELEMENT_NODE);
    });

    it('has localName and nodeName', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.localName).toBe('div');
      expect(el.nodeName).toBe('DIV');
    });

    it('has ownerDocument', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.ownerDocument).toBe(document);
    });

    it('tracks isConnected', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.isConnected).toBe(false);

      document.body.appendChild(el);
      expect(el.isConnected).toBe(true);

      document.body.removeChild(el);
      expect(el.isConnected).toBe(false);
    });

    it('tracks isConnected for nested children', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      expect(child.isConnected).toBe(false);
      document.body.appendChild(parent);
      expect(child.isConnected).toBe(true);

      document.body.removeChild(parent);
      expect(child.isConnected).toBe(false);
    });
  });

  describe('tree navigation', () => {
    it('returns parentNode', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      expect(child.parentNode).toBe(parent);
    });

    it('returns parentElement for element parents', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      expect(child.parentElement).toBe(parent);
    });

    it('returns null parentElement for non-element parents', () => {
      const {document} = createEnv();
      expect(document.documentElement.parentElement).toBe(null);
    });

    it('navigates siblings', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('span');
      const b = document.createElement('span');
      const c = document.createElement('span');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);

      expect(a.nextSibling).toBe(b);
      expect(b.nextSibling).toBe(c);
      expect(c.nextSibling).toBe(null);
      expect(c.previousSibling).toBe(b);
      expect(b.previousSibling).toBe(a);
      expect(a.previousSibling).toBe(null);
    });

    it('navigates element siblings (skipping text nodes)', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('span');
      const text = document.createTextNode('hello');
      const b = document.createElement('span');
      parent.appendChild(a);
      parent.appendChild(text);
      parent.appendChild(b);

      expect(a.nextElementSibling).toBe(b);
      expect(b.previousElementSibling).toBe(a);
    });

    it('returns firstChild and lastChild', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const a = document.createElement('span');
      const b = document.createElement('span');
      parent.appendChild(a);
      parent.appendChild(b);

      expect(parent.firstChild).toBe(a);
      expect(parent.lastChild).toBe(b);
    });

    it('returns null for empty node firstChild/lastChild', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.firstChild).toBe(null);
      expect(el.lastChild).toBe(null);
    });

    it('exposes null siblings for orphan nodes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.previousSibling).toBe(null);
      expect(el.nextSibling).toBe(null);
    });
  });

  describe('nodeValue', () => {
    it('returns null for element nodes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.nodeValue).toBe(null);
    });

    it('returns data for text nodes', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.nodeValue).toBe('hello');
    });
  });

  describe('textContent', () => {
    it('returns text of text nodes', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.textContent).toBe('hello');
    });

    it('returns concatenated text of descendants', () => {
      const {document} = createEnv();
      const div = document.createElement('div');
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('hello'));
      div.appendChild(span);
      div.appendChild(document.createTextNode(' world'));

      expect(div.textContent).toBe('hello world');
    });

    it('sets textContent on elements by replacing children', () => {
      const {document} = createEnv();
      const div = document.createElement('div');
      div.appendChild(document.createElement('span'));
      div.textContent = 'replaced';

      expect(div.childNodes.length).toBe(1);
      expect(div.textContent).toBe('replaced');
    });
  });

  describe('cloneNode', () => {
    it('clones an element (shallow)', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'original');
      el.appendChild(document.createElement('span'));

      const clone = el.cloneNode(false) as Element;
      expect(clone.nodeName).toBe('DIV');
      expect(clone.getAttribute('id')).toBe('original');
      expect(clone.childNodes.length).toBe(0);
    });

    it('clones an element (deep)', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));

      const clone = el.cloneNode(true) as Element;
      expect(clone.childNodes.length).toBe(1);
      expect(clone.childNodes[0]).not.toBe(el.childNodes[0]);
    });

    it('clones a text node', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      const clone = text.cloneNode();
      expect(clone.textContent).toBe('hello');
      expect(clone).not.toBe(text);
    });
  });

  describe('contains', () => {
    it('returns true for self', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.contains(el)).toBe(true);
    });

    it('returns true for direct child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(parent.contains(child)).toBe(true);
    });

    it('returns true for deep descendant', () => {
      const {document} = createEnv();
      const root = document.createElement('div');
      const child = document.createElement('div');
      const grandchild = document.createElement('span');
      root.appendChild(child);
      child.appendChild(grandchild);
      expect(root.contains(grandchild)).toBe(true);
    });

    it('returns false for unrelated node', () => {
      const {document} = createEnv();
      const a = document.createElement('div');
      const b = document.createElement('div');
      expect(a.contains(b)).toBe(false);
    });

    it('returns false for null', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.contains(null)).toBe(false);
    });
  });
});
