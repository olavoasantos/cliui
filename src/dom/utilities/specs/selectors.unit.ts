import {describe, it, expect, beforeEach} from 'vitest';
import {parseSelector, querySelector, querySelectorAll, matches} from '../selectors';
import {Window} from '../../classes/Window';
import type {Document} from '../../classes/Document';
import {SelectorCombinator, SelectorMatcherType} from '../../types/index';

describe('selector parsing and matching', () => {
  let doc: Document;

  beforeEach(() => {
    const window = new Window();
    doc = window.document;
  });

  describe('parseSelector', () => {
    it('parses element selectors', () => {
      const parts = parseSelector('div');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Element,
        name: 'div',
        value: 'div',
      });
    });

    it('parses ID selectors', () => {
      const parts = parseSelector('#myid');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Id,
        name: 'myid',
        value: 'myid',
      });
    });

    it('parses class selectors', () => {
      const parts = parseSelector('.myclass');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Class,
        name: 'myclass',
        value: 'myclass',
      });
    });

    it('parses attribute selectors without values', () => {
      const parts = parseSelector('[disabled]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Attribute,
        name: 'disabled',
        value: undefined,
      });
    });

    it('parses attribute selectors with values', () => {
      const parts = parseSelector('[type="button"]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Attribute,
        name: 'type',
        value: 'button',
      });
    });

    it('parses pseudo-class selectors', () => {
      const parts = parseSelector(':hover');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Pseudo,
        name: 'hover',
        value: undefined,
      });
    });

    it('parses function selectors', () => {
      const parts = parseSelector(':has(div)');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Function,
        name: 'has',
        value: 'div',
      });
    });

    it('parses :not() function selectors', () => {
      const parts = parseSelector(':not(.hidden)');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!).toMatchObject({
        type: SelectorMatcherType.Function,
        name: 'not',
        value: '.hidden',
      });
    });

    it('parses compound selectors', () => {
      const parts = parseSelector('div.myclass#myid[type="button"]');
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers).toHaveLength(4);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[0]!.matchers[1]!.name).toBe('myclass');
      expect(parts[0]!.matchers[2]!.name).toBe('myid');
      expect(parts[0]!.matchers[3]!.name).toBe('type');
    });

    it('parses child combinator', () => {
      const parts = parseSelector('div > span');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Child);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[1]!.matchers[0]!.name).toBe('span');
    });

    it('parses descendant combinator', () => {
      const parts = parseSelector('div span');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Descendant);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[1]!.matchers[0]!.name).toBe('span');
    });

    it('parses adjacent sibling combinator', () => {
      const parts = parseSelector('h1 + p');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Adjacent);
      expect(parts[0]!.matchers[0]!.name).toBe('h1');
      expect(parts[1]!.combinator).toBe(SelectorCombinator.Inner);
      expect(parts[1]!.matchers[0]!.name).toBe('p');
    });

    it('parses general sibling combinator', () => {
      const parts = parseSelector('h1 ~ p');
      expect(parts).toHaveLength(2);
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Sibling);
      expect(parts[0]!.matchers[0]!.name).toBe('h1');
      expect(parts[1]!.combinator).toBe(SelectorCombinator.Inner);
      expect(parts[1]!.matchers[0]!.name).toBe('p');
    });

    it('parses complex selectors', () => {
      const parts = parseSelector('article > .header + .content:not(.hidden)');
      expect(parts).toHaveLength(3);
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Child);
      expect(parts[1]!.combinator).toBe(SelectorCombinator.Adjacent);
      expect(parts[2]!.combinator).toBe(SelectorCombinator.Inner);
      expect(parts[0]!.matchers[0]!.name).toBe('article');
      expect(parts[1]!.matchers[0]!.name).toBe('header');
      expect(parts[2]!.matchers).toHaveLength(2);
      expect(parts[2]!.matchers[0]!.name).toBe('content');
      expect(parts[2]!.matchers[1]!.name).toBe('not');
    });
  });

  describe('querySelector and querySelectorAll', () => {
    it('selects by element name', () => {
      const container = doc.createElement('div');
      const p1 = doc.createElement('p');
      const p2 = doc.createElement('p');
      container.appendChild(p1);
      container.appendChild(p2);

      const all = querySelectorAll(container, 'p');
      expect(all).toHaveLength(2);

      const first = querySelector(container, 'p');
      expect(first).toBe(p1);
    });

    it('selects by ID', () => {
      const container = doc.createElement('div');
      const child = doc.createElement('span');
      child.setAttribute('id', 'target');
      container.appendChild(child);

      expect(querySelector(container, '#target')).toBe(child);
    });

    it('selects by class', () => {
      const container = doc.createElement('div');
      const a = doc.createElement('span');
      a.setAttribute('class', 'active');
      const b = doc.createElement('span');
      b.setAttribute('class', 'inactive');
      container.appendChild(a);
      container.appendChild(b);

      expect(querySelectorAll(container, '.active')).toHaveLength(1);
      expect(querySelector(container, '.active')).toBe(a);
    });

    it('selects by attribute', () => {
      const container = doc.createElement('div');
      const link = doc.createElement('a');
      link.setAttribute('href', '#');
      container.appendChild(link);

      expect(querySelectorAll(container, '[href]')).toHaveLength(1);
      expect(querySelectorAll(container, '[href="#"]')).toHaveLength(1);
    });

    it('selects with descendant combinator', () => {
      const container = doc.createElement('div');
      const wrapper = doc.createElement('section');
      const p = doc.createElement('p');
      wrapper.appendChild(p);
      container.appendChild(wrapper);

      expect(querySelector(container, 'section p')).toBe(p);
    });

    it('selects with child combinator', () => {
      const container = doc.createElement('div');
      const p = doc.createElement('p');
      container.appendChild(p);

      expect(querySelector(container, 'div > p')).toBe(p);
    });

    it('selects with adjacent sibling combinator', () => {
      const container = doc.createElement('div');
      const h1 = doc.createElement('h1');
      const p = doc.createElement('p');
      container.appendChild(h1);
      container.appendChild(p);

      expect(querySelector(container, 'h1 + p')).toBe(p);
    });

    it('selects with general sibling combinator', () => {
      const container = doc.createElement('div');
      const h1 = doc.createElement('h1');
      const div = doc.createElement('div');
      const p = doc.createElement('p');
      container.appendChild(h1);
      container.appendChild(div);
      container.appendChild(p);

      expect(querySelectorAll(container, 'h1 ~ p')).toHaveLength(1);
    });

    it('returns null/empty for non-matching selectors', () => {
      const container = doc.createElement('div');
      expect(querySelector(container, '.nonexistent')).toBeNull();
      expect(querySelectorAll(container, '.nonexistent')).toHaveLength(0);
    });

    it('handles empty selector', () => {
      const container = doc.createElement('div');
      expect(querySelectorAll(container, '')).toHaveLength(0);
    });

    it('selects with universal selector', () => {
      const container = doc.createElement('div');
      const a = doc.createElement('span');
      const b = doc.createElement('p');
      container.appendChild(a);
      container.appendChild(b);

      expect(querySelectorAll(container, '*')).toHaveLength(2);
    });
  });

  describe('matches', () => {
    it('matches element selectors', () => {
      const el = doc.createElement('div');
      expect(matches(el, 'div')).toBe(true);
      expect(matches(el, 'span')).toBe(false);
    });

    it('matches class selectors', () => {
      const el = doc.createElement('div');
      el.setAttribute('class', 'foo bar');
      expect(matches(el, '.foo')).toBe(true);
      expect(matches(el, '.bar')).toBe(true);
      expect(matches(el, '.baz')).toBe(false);
    });

    it('matches ID selectors', () => {
      const el = doc.createElement('div');
      el.setAttribute('id', 'test');
      expect(matches(el, '#test')).toBe(true);
      expect(matches(el, '#other')).toBe(false);
    });

    it('matches attribute selectors', () => {
      const el = doc.createElement('div');
      el.setAttribute('data-active', 'true');
      expect(matches(el, '[data-active]')).toBe(true);
      expect(matches(el, '[data-active="true"]')).toBe(true);
      expect(matches(el, '[data-active="false"]')).toBe(false);
    });

    it('matches compound selectors', () => {
      const el = doc.createElement('div');
      el.setAttribute('class', 'active');
      el.setAttribute('id', 'main');
      expect(matches(el, 'div.active#main')).toBe(true);
      expect(matches(el, 'span.active#main')).toBe(false);
    });
  });
});
