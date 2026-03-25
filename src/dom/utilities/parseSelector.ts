import {SelectorCombinator, SelectorMatcherType} from '../constants';

import type {SelectorMatcherType as SelectorMatcherTypeValue, SelectorPart} from '../types';

const ELEMENT_SELECTOR_TEST = /[a-z]/;
const TOKENIZER =
  /\s*?([>\s+~]?)\s*?(?:(?:\[\s*([^\]=]+)(?:=(["'])(.*?)\3)?\s*\])|([#.]?)([^\s#.[>:+~]+)|:(\w+)(?:\((.*?)\))?)/gi;

/** Parses a CSS selector string into a structured selector AST. */
export function parseSelector(selector: string) {
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

  return parts;
}
