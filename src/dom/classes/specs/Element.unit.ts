import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Element', () => {
  describe('basic properties', () => {
    it('has correct nodeType', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.nodeType).toBe(1);
    });

    it('has uppercase tagName', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('has uppercase nodeName', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.nodeName).toBe('DIV');
    });

    it('has lowercase localName', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.localName).toBe('div');
    });

    it('has XHTML namespace by default', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    });
  });

  describe('attributes', () => {
    it('sets and gets attributes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      expect(el.getAttribute('id')).toBe('test');
    });

    it('hasAttribute returns true for set attributes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('class', 'foo');
      expect(el.hasAttribute('class')).toBe(true);
    });

    it('hasAttribute returns false for unset attributes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.hasAttribute('class')).toBe(false);
    });

    it('removeAttribute removes an attribute', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.removeAttribute('id');
      expect(el.getAttribute('id')).toBeNull();
      expect(el.hasAttribute('id')).toBe(false);
    });

    it('getAttributeNames returns all attribute names', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.setAttribute('class', 'foo');
      expect(el.getAttributeNames()).toEqual(['id', 'class']);
    });

    it('getAttribute returns null for missing attribute', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.getAttribute('missing')).toBeNull();
    });
  });

  describe('children', () => {
    it('firstElementChild returns first element child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createTextNode('text'));
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(parent.firstElementChild).toBe(child);
    });

    it('firstElementChild returns null when no element children', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createTextNode('text'));
      expect(parent.firstElementChild).toBeNull();
    });

    it('lastElementChild returns last element child', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const last = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(last);
      parent.appendChild(document.createTextNode('text'));
      expect(parent.lastElementChild).toBe(last);
    });

    it('children only contains element nodes', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      parent.appendChild(document.createTextNode('text'));
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createComment('comment'));
      parent.appendChild(document.createElement('p'));
      expect(parent.children.length).toBe(2);
      expect(parent.childNodes.length).toBe(4);
    });
  });

  describe('innerHTML', () => {
    it('serializes children to HTML', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.appendChild(document.createTextNode('hello'));
      expect(el.innerHTML).toBe('hello');
    });

    it('parses and sets HTML content', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.innerHTML = '<span>test</span>';
      expect(el.childNodes.length).toBe(1);
      expect(el.firstChild?.nodeName).toBe('SPAN');
    });

    it('clears children when set to empty string', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));
      el.innerHTML = '';
      expect(el.childNodes.length).toBe(0);
    });

    it('clears children when set to null', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));
      el.innerHTML = null;
      expect(el.childNodes.length).toBe(0);
    });
  });

  describe('outerHTML', () => {
    it('serializes element and children', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.appendChild(document.createTextNode('hello'));
      expect(el.outerHTML).toBe('<div id="test">hello</div>');
    });
  });

  describe('sibling navigation', () => {
    it('nextElementSibling skips non-element nodes', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const text = document.createTextNode('text');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(text);
      parent.appendChild(second);
      expect(first.nextElementSibling).toBe(second);
    });

    it('previousElementSibling skips non-element nodes', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const text = document.createTextNode('text');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(text);
      parent.appendChild(second);
      expect(second.previousElementSibling).toBe(first);
    });
  });
});
