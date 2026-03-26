import {describe, expect, it} from 'vitest';

import {OWNER_DOCUMENT} from '../../constants';
import {Node} from '../../classes/Node';
import {Window} from '../../classes/Window';
import {cloneNode} from '../cloneNode';
import {createNode} from '../createNode';

describe('cloneNode', () => {
  describe('text node', () => {
    it('clones preserving data', () => {
      const document = new Window().document;
      const text = document.createTextNode('hello');
      const clone = cloneNode(text);

      expect(clone).not.toBe(text);
      expect(clone.textContent).toBe('hello');
      expect(clone.ownerDocument).toBe(document);
    });
  });

  describe('comment node', () => {
    it('clones preserving data', () => {
      const document = new Window().document;
      const comment = document.createComment('note');
      const clone = cloneNode(comment);

      expect(clone).not.toBe(comment);
      expect(clone.textContent).toBe('note');
      expect(clone.ownerDocument).toBe(document);
    });
  });

  describe('element', () => {
    it('clones with the correct localName', () => {
      const document = new Window().document;
      const element = document.createElement('article');
      const clone = cloneNode(element);

      expect(clone.localName).toBe('article');
    });

    it('copies all attributes to the clone', () => {
      const document = new Window().document;
      const element = document.createElement('article');
      element.setAttribute('id', 'post');
      element.setAttributeNS('urn:test', 'data-flag', 'yes');
      const clone = cloneNode(element) as typeof element;

      expect(clone.getAttribute('id')).toBe('post');
      expect(clone.getAttributeNS('urn:test', 'data-flag')).toBe('yes');
    });

    it('recursively clones children when deep is true', () => {
      const document = new Window().document;
      const element = document.createElement('article');
      const child = document.createElement('span');
      child.append('hello');
      element.append(child);
      const clone = cloneNode(element, true) as typeof element;

      expect(clone.childNodes).toHaveLength(1);
      expect(clone.firstChild?.textContent).toBe('hello');
    });

    it('does not clone children when deep is false', () => {
      const document = new Window().document;
      const element = document.createElement('article');
      element.append(document.createElement('span'));
      const clone = cloneNode(element, false) as typeof element;

      expect(clone.childNodes).toHaveLength(0);
    });
  });

  describe('document fragment', () => {
    it('creates a new fragment', () => {
      const document = new Window().document;
      const fragment = document.createDocumentFragment();
      const clone = cloneNode(fragment);

      expect(clone).not.toBe(fragment);
      expect(clone.childNodes).toHaveLength(0);
    });

    it('recursively clones children when deep is true', () => {
      const document = new Window().document;
      const fragment = document.createDocumentFragment();
      const child = document.createElement('span');
      child.append('hello');
      fragment.append(child);
      const clone = cloneNode(fragment, true);

      expect(clone.childNodes).toHaveLength(1);
      expect(clone.firstChild?.textContent).toBe('hello');
    });

    it('creates an empty fragment when deep is false', () => {
      const document = new Window().document;
      const fragment = document.createDocumentFragment();
      fragment.append(document.createElement('span'));
      const clone = cloneNode(fragment, false);

      expect(clone.childNodes).toHaveLength(0);
    });
  });

  describe('cross-document cloning', () => {
    it('clones into a different document when specified', () => {
      const sourceWindow = new Window();
      const targetWindow = new Window();
      const element = sourceWindow.document.createElement('article');
      element.setAttributeNS('urn:test', 'data-flag', 'yes');
      element.append(sourceWindow.document.createTextNode('hello'));
      const clone = cloneNode(element, true, targetWindow.document) as typeof element;

      expect(clone.ownerDocument).toBe(targetWindow.document);
      expect(clone.firstChild?.ownerDocument).toBe(targetWindow.document);
      expect(clone.getAttributeNS('urn:test', 'data-flag')).toBe('yes');
    });

    it('uses the node own ownerDocument when document is omitted', () => {
      const window = new Window();
      const element = window.document.createElement('article');
      const clone = cloneNode(element);

      expect(clone.ownerDocument).toBe(window.document);
    });
  });

  it('clones fallback custom node paths', () => {
    class CustomNode extends Node {
      override nodeType = 99 as never;
    }

    const window = new Window();
    const node = createNode(new CustomNode(), window.document);
    const clone = cloneNode(node) as CustomNode;

    expect(clone).toBeInstanceOf(CustomNode);
    expect(clone).not.toBe(node);
    expect(clone[OWNER_DOCUMENT]).toBe(window.document);
  });
});
