import {SelectorCombinator, SelectorMatcherType} from '../constants';

import type {SelectorMatcherType as SelectorMatcherTypeValue, SelectorPart} from '../types';

const ELEMENT_SELECTOR_TEST = /[a-z]/;
const TOKENIZER =
  /\s*?([>\s+~]?)\s*?(?:(?:\[\s*([^\]=]+)(?:=(["'])(.*?)\3)?\s*\])|([#.]?)([^\s#.[>:+~]+)|:(\w+)(?:\((.*?)\))?)/gi;

/** Parsed selector cache to prevent redundant RegExp execution */
const PARSED_SELECTOR_CACHE = new Map<string, SelectorPart[]>();

/**
 * Parses a CSS selector string into a structured selector AST.
 *
 * Results are cached — repeated calls with the same selector string
 * return the same array instance without re-parsing.
 *
 * @param selector - A CSS selector string (e.g. `'div.active > span'`).
 * @returns An array of parsed selector parts, ordered from the innermost
 *   (rightmost) part to the outermost (leftmost) combinator.
 *
 * @example
 * ```ts
 * parseSelector('div.foo');
 * // [{ combinator: 0, matchers: [{ type: 1, name: 'div' }, { type: 3, name: 'foo' }] }]
 * ```
 */
export function parseSelector(selector: string) {
  if (PARSED_SELECTOR_CACHE.has(selector)) {
    return PARSED_SELECTOR_CACHE.get(selector)!;
  }

  let part: SelectorPart = {combinator: SelectorCombinator.Inner, matchers: []};
  const parts = [part];
  let token: RegExpExecArray | null;

  while ((token = TOKENIZER.exec(selector))) {
    if (token[1]) {
      if (token[1] === '>') part.combinator = SelectorCombinator.Child;
      else if (token[1] === '+') part.combinator = SelectorCombinator.Adjacent;
      else if (token[1] === '~') part.combinator = SelectorCombinator.Sibling;
      else part.combinator = SelectorCombinator.Descendant;
      part = {combinator: SelectorCombinator.Inner, matchers: []};
      parts.push(part);
    }

    let type: SelectorMatcherTypeValue = SelectorMatcherType.Unknown;
    if (token[2]) {
      type = SelectorMatcherType.Attribute;
    } else if (token[5]) {
      type = token[5] === '#' ? SelectorMatcherType.Id : SelectorMatcherType.Class;
    } else if (token[7]) {
      type = token[8] == null ? SelectorMatcherType.Pseudo : SelectorMatcherType.Function;
    } else if (token[6]) {
      if (token[6] === '*') {
        type = SelectorMatcherType.Unknown;
      } else if (ELEMENT_SELECTOR_TEST.test(token[6])) {
        type = SelectorMatcherType.Element;
      }
    }

    part.matchers.push({
      type,
      name: (token[2] || token[6] || token[7])!,
      value: token[4] ?? token[6] ?? token[8],
    });
  }

  // Cap cache size to prevent memory leaks in extreme cases
  if (PARSED_SELECTOR_CACHE.size > 1000) {
    const firstKey = PARSED_SELECTOR_CACHE.keys().next().value;
    if (firstKey) PARSED_SELECTOR_CACHE.delete(firstKey);
  }
  PARSED_SELECTOR_CACHE.set(selector, parts);

  return parts;
}
