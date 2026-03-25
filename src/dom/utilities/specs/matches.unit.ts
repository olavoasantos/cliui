import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {matches} from '../matches';

import type {Document} from '../../classes/Document';

describe('matches', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  it('matches element selectors', () => {
    const element = document.createElement('div');
    expect(matches(element, 'div')).toBe(true);
    expect(matches(element, 'span')).toBe(false);
  });

  it('matches class selectors', () => {
    const element = document.createElement('div');
    element.setAttribute('class', 'foo bar');
    expect(matches(element, '.foo')).toBe(true);
    expect(matches(element, '.bar')).toBe(true);
    expect(matches(element, '.baz')).toBe(false);
  });

  it('matches ID selectors', () => {
    const element = document.createElement('div');
    element.setAttribute('id', 'test');
    expect(matches(element, '#test')).toBe(true);
    expect(matches(element, '#other')).toBe(false);
  });

  it('matches attribute selectors', () => {
    const element = document.createElement('div');
    element.setAttribute('data-active', 'true');
    expect(matches(element, '[data-active]')).toBe(true);
    expect(matches(element, '[data-active="true"]')).toBe(true);
    expect(matches(element, '[data-active="false"]')).toBe(false);
  });

  it('matches compound selectors', () => {
    const element = document.createElement('div');
    element.setAttribute('class', 'active');
    element.setAttribute('id', 'main');
    expect(matches(element, 'div.active#main')).toBe(true);
    expect(matches(element, 'span.active#main')).toBe(false);
  });
});
