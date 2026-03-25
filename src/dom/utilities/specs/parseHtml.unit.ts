import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';
import {serializeChildren} from '../serializeChildren';

import type {Document} from '../../classes/Document';
import type {Element} from '../../classes/Element';

describe('parseHtml', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('parses a simple element', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('<span>Hello</span>', container);

    expect(fragment.childNodes).toHaveLength(1);
    expect(fragment.childNodes[0]!.nodeName.toLowerCase()).toBe('span');
    expect(fragment.childNodes[0]!.textContent).toBe('Hello');
  });

  it('parses an element with attributes', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('<span data-id="123">Text</span>', container);

    const span = fragment.childNodes[0]! as Element;
    expect(span.getAttribute('data-id')).toBe('123');
    expect(span.textContent).toBe('Text');
  });

  it('parses nested elements', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('<div><span>Inner</span></div>', container);

    const div = fragment.childNodes[0]! as Element;
    expect(div.childNodes).toHaveLength(1);
    expect(div.childNodes[0]!.nodeName.toLowerCase()).toBe('span');
    expect(div.childNodes[0]!.textContent).toBe('Inner');
  });

  it('parses multiple sibling elements', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('<p>One</p><p>Two</p><p>Three</p>', container);

    expect(fragment.childNodes).toHaveLength(3);
    expect(fragment.childNodes[0]!.textContent).toBe('One');
    expect(fragment.childNodes[1]!.textContent).toBe('Two');
    expect(fragment.childNodes[2]!.textContent).toBe('Three');
  });

  it('parses comments', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('<!--comment-->', container);

    expect(fragment.childNodes).toHaveLength(1);
    expect(fragment.childNodes[0]!.nodeType).toBe(8);
  });

  it('parses text content', () => {
    const container = document.createElement('div');
    const fragment = parseHtml('Just text', container);

    expect(fragment.childNodes).toHaveLength(1);
    expect(fragment.childNodes[0]!.nodeType).toBe(3);
    expect(fragment.childNodes[0]!.textContent).toBe('Just text');
  });

  it('parses attributes with multiline values', () => {
    const container = document.createElement('div');
    const fragment = parseHtml(`<span data-val="line1\nline2">Text</span>`, container);

    const span = fragment.childNodes[0]! as Element;
    expect(span.getAttribute('data-val')).toBe('line1\nline2');
  });

  it('preserves structure through parse and serialize', () => {
    const html = '<div class="box"><span>Hello</span><p>World</p></div>';
    const container = document.createElement('div');
    const fragment = parseHtml(html, container);
    const wrapper = document.createElement('div');

    for (const child of Array.from(fragment.childNodes)) {
      wrapper.appendChild(child);
    }

    expect(serializeChildren(wrapper)).toBe(html);
  });
});
