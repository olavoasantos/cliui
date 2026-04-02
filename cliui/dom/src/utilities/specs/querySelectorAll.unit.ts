import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {querySelectorAll} from '../querySelectorAll';

import type {Document} from '../../classes/Document';

describe('querySelectorAll', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('selects all matching elements by name', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('p'));
    container.appendChild(document.createElement('p'));

    expect(querySelectorAll(container, 'p')).toHaveLength(2);
  });

  it('selects all matching elements by attribute value', () => {
    const container = document.createElement('div');
    const first = document.createElement('a');
    first.setAttribute('href', '#');
    const second = document.createElement('a');
    second.setAttribute('href', '#');
    container.appendChild(first);
    container.appendChild(second);

    expect(querySelectorAll(container, '[href="#"]')).toHaveLength(2);
  });

  it('selects with general sibling combinators', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('h1'));
    container.appendChild(document.createElement('div'));
    container.appendChild(document.createElement('p'));

    expect(querySelectorAll(container, 'h1 ~ p')).toHaveLength(1);
  });

  it('returns an empty list for non-matching selectors', () => {
    const container = document.createElement('div');
    expect(querySelectorAll(container, '.nonexistent')).toHaveLength(0);
  });

  it('returns an empty list for empty selectors', () => {
    const container = document.createElement('div');
    expect(querySelectorAll(container, '')).toHaveLength(0);
  });

  it('supports the universal selector', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('span'));
    container.appendChild(document.createElement('p'));

    expect(querySelectorAll(container, '*')).toHaveLength(2);
  });
});
