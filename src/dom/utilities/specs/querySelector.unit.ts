import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {querySelector} from '../querySelector';

import type {Document} from '../../classes/Document';

describe('querySelector', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('selects the first matching element by name', () => {
    const container = document.createElement('div');
    const first = document.createElement('p');
    const second = document.createElement('p');
    container.appendChild(first);
    container.appendChild(second);

    expect(querySelector(container, 'p')).toBe(first);
  });

  it('selects by ID', () => {
    const container = document.createElement('div');
    const child = document.createElement('span');
    child.setAttribute('id', 'target');
    container.appendChild(child);

    expect(querySelector(container, '#target')).toBe(child);
  });

  it('selects by class', () => {
    const container = document.createElement('div');
    const active = document.createElement('span');
    active.setAttribute('class', 'active');
    container.appendChild(active);

    expect(querySelector(container, '.active')).toBe(active);
  });

  it('selects by attribute', () => {
    const container = document.createElement('div');
    const link = document.createElement('a');
    link.setAttribute('href', '#');
    container.appendChild(link);

    expect(querySelector(container, '[href]')).toBe(link);
  });

  it('selects with descendant combinators', () => {
    const container = document.createElement('div');
    const wrapper = document.createElement('section');
    const child = document.createElement('p');
    wrapper.appendChild(child);
    container.appendChild(wrapper);

    expect(querySelector(container, 'section p')).toBe(child);
  });

  it('selects with child combinators', () => {
    const container = document.createElement('div');
    const child = document.createElement('p');
    container.appendChild(child);

    expect(querySelector(container, 'div > p')).toBe(child);
  });

  it('selects with adjacent sibling combinators', () => {
    const container = document.createElement('div');
    const title = document.createElement('h1');
    const paragraph = document.createElement('p');
    container.appendChild(title);
    container.appendChild(paragraph);

    expect(querySelector(container, 'h1 + p')).toBe(paragraph);
  });

  it('returns null for non-matching selectors', () => {
    const container = document.createElement('div');
    expect(querySelector(container, '.nonexistent')).toBeNull();
  });
});
