import {describe, it, expect, beforeEach} from 'vitest';
import {parseHtml, serializeChildren, serializeNode} from '../serialization';
import {Window} from '../../classes/Window';
import type {Document} from '../../classes/Document';

describe('serialization', () => {
  let doc: Document;

  beforeEach(() => {
    const window = new Window();
    doc = window.document;
  });

  describe('parseHtml', () => {
    it('parses a simple element', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('<span>Hello</span>', container);

      expect(fragment.childNodes).toHaveLength(1);
      const span = fragment.childNodes[0]!;
      expect(span.nodeName.toLowerCase()).toBe('span');
      expect(span.textContent).toBe('Hello');
    });

    it('parses an element with attributes', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('<span data-id="123">Text</span>', container);

      const span = fragment.childNodes[0]! as import('../../classes/Element').Element;
      expect(span.getAttribute('data-id')).toBe('123');
      expect(span.textContent).toBe('Text');
    });

    it('parses nested elements', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('<div><span>Inner</span></div>', container);

      const div = fragment.childNodes[0]! as import('../../classes/Element').Element;
      expect(div.childNodes).toHaveLength(1);
      expect(div.childNodes[0]!.nodeName.toLowerCase()).toBe('span');
      expect(div.childNodes[0]!.textContent).toBe('Inner');
    });

    it('parses multiple sibling elements', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('<p>One</p><p>Two</p><p>Three</p>', container);

      expect(fragment.childNodes).toHaveLength(3);
      expect(fragment.childNodes[0]!.textContent).toBe('One');
      expect(fragment.childNodes[1]!.textContent).toBe('Two');
      expect(fragment.childNodes[2]!.textContent).toBe('Three');
    });

    it('parses comments', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('<!--comment-->', container);

      expect(fragment.childNodes).toHaveLength(1);
      expect(fragment.childNodes[0]!.nodeType).toBe(8); // COMMENT_NODE
    });

    it('parses text content', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml('Just text', container);

      expect(fragment.childNodes).toHaveLength(1);
      expect(fragment.childNodes[0]!.nodeType).toBe(3); // TEXT_NODE
      expect(fragment.childNodes[0]!.textContent).toBe('Just text');
    });

    it('parses attributes with multiline values', () => {
      const container = doc.createElement('div');
      const fragment = parseHtml(`<span data-val="line1\nline2">Text</span>`, container);

      const span = fragment.childNodes[0]! as import('../../classes/Element').Element;
      expect(span.getAttribute('data-val')).toBe('line1\nline2');
    });
  });

  describe('serializeNode', () => {
    it('serializes an element', () => {
      const el = doc.createElement('div');
      expect(serializeNode(el)).toBe('<div></div>');
    });

    it('serializes an element with attributes', () => {
      const el = doc.createElement('div');
      el.setAttribute('class', 'box');
      expect(serializeNode(el)).toBe('<div class="box"></div>');
    });

    it('serializes a text node', () => {
      const text = doc.createTextNode('Hello');
      expect(serializeNode(text)).toBe('Hello');
    });

    it('escapes special characters in text', () => {
      const text = doc.createTextNode('<div>"a" & "b"</div>');
      expect(serializeNode(text)).toBe('&lt;div&gt;&quot;a&quot; &amp; &quot;b&quot;&lt;/div&gt;');
    });

    it('serializes a comment', () => {
      const comment = doc.createComment('a comment');
      expect(serializeNode(comment)).toBe('<!--a comment-->');
    });

    it('serializes nested elements', () => {
      const el = doc.createElement('div');
      const child = doc.createElement('span');
      child.appendChild(doc.createTextNode('Hi'));
      el.appendChild(child);
      expect(serializeNode(el)).toBe('<div><span>Hi</span></div>');
    });
  });

  describe('serializeChildren', () => {
    it('serializes all child nodes', () => {
      const el = doc.createElement('div');
      el.appendChild(doc.createElement('span'));
      el.appendChild(doc.createTextNode('text'));
      el.appendChild(doc.createElement('p'));
      expect(serializeChildren(el)).toBe('<span></span>text<p></p>');
    });

    it('returns empty string for empty element', () => {
      const el = doc.createElement('div');
      expect(serializeChildren(el)).toBe('');
    });
  });

  describe('round-trip', () => {
    it('preserves structure through parse and serialize', () => {
      const html = '<div class="box"><span>Hello</span><p>World</p></div>';
      const container = doc.createElement('div');
      const fragment = parseHtml(html, container);

      const div = doc.createElement('div');
      for (const child of Array.from(fragment.childNodes)) {
        div.appendChild(child);
      }
      expect(serializeChildren(div)).toBe(html);
    });
  });
});
