import {describe, expect, it} from 'vitest';

import {SelectorCombinator, SelectorMatcherType} from '../../constants';
import {parseSelector} from '../parseSelector';

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
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Id,
      name: 'myid',
      value: 'myid',
    });
  });

  it('parses class selectors', () => {
    const parts = parseSelector('.myclass');
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Class,
      name: 'myclass',
      value: 'myclass',
    });
  });

  it('parses attribute selectors without values', () => {
    const parts = parseSelector('[disabled]');
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Attribute,
      name: 'disabled',
      value: undefined,
    });
  });

  it('parses attribute selectors with values', () => {
    const parts = parseSelector('[type="button"]');
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Attribute,
      name: 'type',
      value: 'button',
    });
  });

  it('parses pseudo-class selectors', () => {
    const parts = parseSelector(':hover');
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Pseudo,
      name: 'hover',
      value: undefined,
    });
  });

  it('parses function selectors', () => {
    const parts = parseSelector(':has(div)');
    expect(parts[0]!.matchers[0]!).toMatchObject({
      type: SelectorMatcherType.Function,
      name: 'has',
      value: 'div',
    });
  });

  it('parses not function selectors', () => {
    const parts = parseSelector(':not(.hidden)');
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

  it('parses child combinators', () => {
    const parts = parseSelector('div > span');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.combinator).toBe(SelectorCombinator.Child);
    expect(parts[1]!.matchers[0]!.name).toBe('span');
  });

  it('parses descendant combinators', () => {
    const parts = parseSelector('div span');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.combinator).toBe(SelectorCombinator.Descendant);
    expect(parts[1]!.matchers[0]!.name).toBe('span');
  });

  it('parses adjacent sibling combinators', () => {
    const parts = parseSelector('h1 + p');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.combinator).toBe(SelectorCombinator.Adjacent);
    expect(parts[1]!.combinator).toBe(SelectorCombinator.Inner);
  });

  it('parses general sibling combinators', () => {
    const parts = parseSelector('h1 ~ p');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.combinator).toBe(SelectorCombinator.Sibling);
    expect(parts[1]!.combinator).toBe(SelectorCombinator.Inner);
  });

  it('parses complex selectors', () => {
    const parts = parseSelector('article > .header + .content:not(.hidden)');
    expect(parts).toHaveLength(3);
    expect(parts[0]!.combinator).toBe(SelectorCombinator.Child);
    expect(parts[1]!.combinator).toBe(SelectorCombinator.Adjacent);
    expect(parts[2]!.matchers).toHaveLength(2);
  });
});
