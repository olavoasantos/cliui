import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {serializeChildren} from '../serializeChildren';

import type {Document} from '../../classes/Document';

describe('serializeChildren', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('serializes all child nodes', () => {
    const element = document.createElement('div');
    element.appendChild(document.createElement('span'));
    element.appendChild(document.createTextNode('text'));
    element.appendChild(document.createElement('p'));

    expect(serializeChildren(element)).toBe('<span></span>text<p></p>');
  });

  it('returns an empty string for empty elements', () => {
    const element = document.createElement('div');
    expect(serializeChildren(element)).toBe('');
  });
});
