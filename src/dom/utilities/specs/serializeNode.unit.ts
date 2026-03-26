import {beforeEach, describe, expect, it} from 'vitest';

import {Node} from '../../classes/Node';
import {Window} from '../../classes/Window';
import {serializeNode} from '../serializeNode';

import type {Document} from '../../classes/Document';

describe('serializeNode', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('serializes an element', () => {
    const element = document.createElement('div');
    expect(serializeNode(element)).toBe('<div></div>');
  });

  it('serializes an element with attributes', () => {
    const element = document.createElement('div');
    element.setAttribute('class', 'box');
    expect(serializeNode(element)).toBe('<div class="box"></div>');
  });

  it('escapes special characters in attribute values', () => {
    const element = document.createElement('div');
    element.setAttribute('title', 'Tom & "Jerry"');

    expect(serializeNode(element)).toBe('<div title="Tom &amp; &quot;Jerry&quot;"></div>');
  });

  it('serializes boolean-style empty attributes without a value assignment', () => {
    const element = document.createElement('input');
    element.setAttribute('disabled', '');

    expect(serializeNode(element)).toBe('<input disabled></input>');
  });

  it('serializes a text node', () => {
    const text = document.createTextNode('Hello');
    expect(serializeNode(text)).toBe('Hello');
  });

  it('escapes special characters in text nodes', () => {
    const text = document.createTextNode('<div>"a" & "b"</div>');
    expect(serializeNode(text)).toBe('&lt;div&gt;&quot;a&quot; &amp; &quot;b&quot;&lt;/div&gt;');
  });

  it('serializes comments', () => {
    const comment = document.createComment('a comment');
    expect(serializeNode(comment)).toBe('<!--a comment-->');
  });

  it('serializes nested elements', () => {
    const element = document.createElement('div');
    const child = document.createElement('span');
    child.appendChild(document.createTextNode('Hi'));
    element.appendChild(child);

    expect(serializeNode(element)).toBe('<div><span>Hi</span></div>');
  });

  it('returns an empty string for document fragments', () => {
    const fragment = document.createDocumentFragment();
    fragment.append(document.createElement('span'));

    expect(serializeNode(fragment)).toBe('');
  });

  it('returns an empty string for unknown node types', () => {
    const node = new Node();

    expect(serializeNode(node)).toBe('');
  });
});
