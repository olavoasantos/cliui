import {CHILD, NEXT, PARENT, PREV} from '../constants/index';
import {SelectorCombinator, SelectorMatcherType} from '../types/index';
import {isElementNode} from './shared';

import type {Node} from '../classes/Node';
import type {Element} from '../classes/Element';
import type {ParentNode} from '../classes/ParentNode';
import type {SelectorMatcher, SelectorPart} from '../types/index';

const ELEMENT_SELECTOR_TEST = /[a-z]/;

export function querySelector(within: ParentNode, selector: string) {
  const parts = parseSelector(selector);
  let result: Element | null = null;

  const child = within[CHILD];
  if (child && parts[0]!.matchers.length) {
    walkNodesForSelector(child, parts, (node) => {
      result = node;
      return false;
    });
  }
  return result;
}

export function querySelectorAll(within: ParentNode, selector: string) {
  const parts = parseSelector(selector);
  const results: Element[] = [];

  const child = within[CHILD];
  if (child && parts[0]!.matchers.length) {
    walkNodesForSelector(child, parts, (node) => {
      results.push(node);
    });
  }
  return results;
}

/**
 * Parses a CSS selector string into a structured AST of selector parts.
 */
export function parseSelector(selector: string) {
  let part: SelectorPart = {combinator: SelectorCombinator.Inner, matchers: []};
  const parts = [part];
  const tokenizer =
    /\s*?([>\s+~]?)\s*?(?:(?:\[\s*([^\]=]+)(?:=(['"])(.*?)\3)?\s*\])|([#.]?)([^\s#.[>:+~]+)|:(\w+)(?:\((.*?)\))?)/gi;
  let token;
  while ((token = tokenizer.exec(selector))) {
    if (token[1]) {
      if (token[1] === '>') part.combinator = SelectorCombinator.Child;
      else if (token[1] === '+') part.combinator = SelectorCombinator.Adjacent;
      else if (token[1] === '~') part.combinator = SelectorCombinator.Sibling;
      else part.combinator = SelectorCombinator.Descendant;
      part = {combinator: SelectorCombinator.Inner, matchers: []};
      parts.push(part);
    }

    let type: SelectorMatcherType = SelectorMatcherType.Unknown;
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

/**
 * Tests whether an element matches a given CSS selector string.
 */
export function matches(element: Element, selector: string) {
  const parsed = parseSelector(selector);
  let part: SelectorPart | undefined;
  while ((part = parsed.pop())) {
    if (!matchesSelectorPart(element, part)) return false;
  }
  return true;
}

function walkNodesForSelector(
  node: Node,
  parts: SelectorPart[],
  callback: (node: Element) => boolean | void,
) {
  if (isElementNode(node)) {
    if (matchesSelectorRecursive(node, parts)) {
      if (callback(node) === false) return false;
    }
    const child = node[CHILD];
    if (child && walkNodesForSelector(child, parts, callback) === false) {
      return false;
    }
  }
  const next = node[NEXT];
  if (next && walkNodesForSelector(next, parts, callback) === false) {
    return false;
  }
  return true;
}

function matchesSelectorRecursive(element: Element, parts: SelectorPart[]): boolean {
  const {combinator, matchers} = parts[parts.length - 1]!;
  if (combinator === SelectorCombinator.Inner) {
    if (!matchesSelectorMatcher(element, matchers)) return false;
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(element, pp);
  }
  const link =
    combinator === SelectorCombinator.Child || combinator === SelectorCombinator.Descendant
      ? PARENT
      : PREV;
  let ref = element[link];
  if (!ref) return false;

  if (combinator === SelectorCombinator.Descendant || combinator === SelectorCombinator.Sibling) {
    while (ref) {
      if (isElementNode(ref) && matchesSelectorMatcher(ref, matchers)) {
        const pp = parts.slice(0, -1);
        if (pp.length === 0) return true;
        if (matchesSelectorRecursive(element, pp)) return true;
      }
      ref = ref[link];
    }
    return false;
  } else {
    if (combinator === SelectorCombinator.Adjacent && !isElementNode(ref)) {
      while (ref && !isElementNode(ref)) {
        ref = ref[link];
      }
      if (!ref) return false;
    }

    if (!isElementNode(ref) || !matchesSelectorMatcher(ref, matchers)) {
      return false;
    }
    const pp = parts.slice(0, -1);
    return pp.length === 0 || matchesSelectorRecursive(element, pp);
  }
}

function matchesSelectorPart(element: Element, {combinator, matchers}: SelectorPart) {
  if (combinator === SelectorCombinator.Inner) {
    return matchesSelectorMatcher(element, matchers);
  }
  const link =
    combinator === SelectorCombinator.Child || combinator === SelectorCombinator.Descendant
      ? PARENT
      : PREV;
  let ref = element[link];
  if (!ref) return false;

  if (combinator === SelectorCombinator.Adjacent && !isElementNode(ref)) {
    while (ref && !isElementNode(ref)) {
      ref = ref[link];
    }
    if (!ref) return false;
  }

  if (!isElementNode(ref) || !matchesSelectorMatcher(ref, matchers)) {
    return false;
  }

  if (combinator === SelectorCombinator.Descendant || combinator === SelectorCombinator.Sibling) {
    while ((ref = ref[link])) {
      if (isElementNode(ref) && matchesSelectorMatcher(ref, matchers)) return true;
    }
  }
  return true;
}

function matchesSelectorMatcher(
  element: Element | null,
  matcher: SelectorMatcher | SelectorMatcher[],
): boolean {
  if (!element) return false;
  if (Array.isArray(matcher)) {
    for (const single of matcher) {
      if (matchesSelectorMatcher(element, single) === false) return false;
    }
    return true;
  }
  const {type, name, value} = matcher;
  switch (type) {
    case SelectorMatcherType.Unknown:
      return name === '*';
    case SelectorMatcherType.Element:
      return element.localName === name;
    case SelectorMatcherType.Id:
      return element.getAttribute('id') === name;
    case SelectorMatcherType.Class: {
      const classAttr = element.getAttribute('class');
      if (!classAttr) return false;
      return classAttr.split(/\s+/).includes(name);
    }
    case SelectorMatcherType.Attribute:
      return value == null ? element.hasAttribute(name) : element.getAttribute(name) === value;
    case SelectorMatcherType.Pseudo:
      throw Error(`Pseudo :${name} not implemented`);
    case SelectorMatcherType.Function:
      switch (name) {
        case 'has':
          return matches(element, value || '');
        case 'not':
          return !matches(element, value || '');
        default:
          throw Error(`Function :${name}(${value}) not implemented`);
      }
  }
  return false;
}
