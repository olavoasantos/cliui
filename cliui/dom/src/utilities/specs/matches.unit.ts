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

  it('matches child combinators', () => {
    const parent = document.createElement('section');
    const child = document.createElement('p');
    parent.append(child);

    expect(matches(child, 'section > p')).toBe(true);
  });

  it('matches descendant combinators', () => {
    const ancestor = document.createElement('section');
    const wrapper = document.createElement('div');
    const child = document.createElement('p');
    ancestor.append(wrapper);
    wrapper.append(child);

    expect(matches(child, 'section p')).toBe(true);
  });

  it('matches adjacent combinators across non-element siblings', () => {
    const parent = document.createElement('div');
    const title = document.createElement('h1');
    const spacer = document.createTextNode(' ');
    const paragraph = document.createElement('p');
    parent.append(title, spacer, paragraph);

    expect(matches(paragraph, 'h1 + p')).toBe(true);
  });

  it('matches sibling combinators', () => {
    const parent = document.createElement('div');
    const title = document.createElement('h1');
    const middle = document.createElement('span');
    const paragraph = document.createElement('p');
    parent.append(title, middle, paragraph);

    expect(matches(paragraph, 'h1 ~ p')).toBe(true);
  });

  it('supports the universal selector', () => {
    const element = document.createElement('div');

    expect(matches(element, '*')).toBe(true);
  });

  it('supports :has() selectors', () => {
    const element = document.createElement('div');

    expect(matches(element, 'div:has(div)')).toBe(true);
    expect(matches(element, 'div:has(span)')).toBe(false);
  });

  it('supports :not() selectors', () => {
    const element = document.createElement('div');
    element.setAttribute('class', 'active');

    expect(matches(element, 'div:not(.disabled)')).toBe(true);
    expect(matches(element, 'div:not(.active)')).toBe(false);
  });

  it('matches :focus against the document active element', () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.appendChild(first);
    document.body.appendChild(second);

    document.setActiveElement(first);

    expect(matches(first, 'button:focus')).toBe(true);
    expect(matches(second, 'button:focus')).toBe(false);
  });

  it('matches :active against pressed elements', () => {
    const element = document.createElement('button');

    element.setAttribute('pressed', '');

    expect(matches(element, 'button:active')).toBe(true);

    element.removeAttribute('pressed');

    expect(matches(element, 'button:active')).toBe(false);
  });

  it('matches :disabled and :enabled using the disabled attribute', () => {
    const enabled = document.createElement('button');
    const disabled = document.createElement('button');
    disabled.setAttribute('disabled', '');

    expect(matches(enabled, 'button:enabled')).toBe(true);
    expect(matches(enabled, 'button:disabled')).toBe(false);
    expect(matches(disabled, 'button:disabled')).toBe(true);
    expect(matches(disabled, 'button:enabled')).toBe(false);
  });

  it('matches :hover against the hovered element and its ancestors', () => {
    const parent = document.createElement('div');
    const child = document.createElement('button');
    parent.appendChild(child);
    document.body.appendChild(parent);

    document.setHoveredElement(child);

    expect(matches(child, 'button:hover')).toBe(true);
    expect(matches(parent, 'div:hover')).toBe(true);
    expect(matches(document.body, 'body:hover')).toBe(true);

    document.setHoveredElement(null);

    expect(matches(child, 'button:hover')).toBe(false);
    expect(matches(parent, 'div:hover')).toBe(false);
  });

  it('returns false for unsupported pseudo selectors', () => {
    const element = document.createElement('div');

    expect(matches(element, 'div:visited')).toBe(false);
  });

  it('throws for unsupported selector functions', () => {
    const element = document.createElement('div');

    expect(() => matches(element, 'div:where(.active)')).toThrow(
      'Function :where(.active) not implemented',
    );
  });

  it('returns false when a combinator cannot resolve an element relationship', () => {
    const detached = document.createElement('p');

    expect(matches(detached, 'section > p')).toBe(false);
  });

  it('matches :root against the document element', () => {
    expect(matches(document.documentElement, ':root')).toBe(true);
    expect(matches(document.body, ':root')).toBe(false);
  });
});
