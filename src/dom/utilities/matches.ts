import {PARENT, PREV, SelectorCombinator, SelectorMatcherType} from '../constants';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {parseSelector} from './parseSelector';

import type {Element} from '../classes/Element';
import type {SelectorMatcher, SelectorPart} from '../types';

/** Tests whether an element matches a CSS selector string. */
export function matches(element: Element, selector: string) {
  const parsed = parseSelector(selector);
  let part: SelectorPart | undefined;
  while ((part = parsed.pop())) {
    if (!matchesSelectorPart(element, part)) return false;
  }
  return true;
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

  if (combinator === SelectorCombinator.Descendant || combinator === SelectorCombinator.Sibling) {
    while (ref) {
      if (ElementNodeGuard(ref) && matchesSelectorMatcher(ref, matchers)) return true;
      ref = ref[link];
    }
    return false;
  }

  if (combinator === SelectorCombinator.Adjacent && !ElementNodeGuard(ref)) {
    while (ref && !ElementNodeGuard(ref)) {
      ref = ref[link];
    }
    if (!ref) return false;
  }

  return ElementNodeGuard(ref) && matchesSelectorMatcher(ref, matchers);
}

function matchesSelectorMatcher(
  element: Element | null,
  matcher: SelectorMatcher | SelectorMatcher[],
): boolean {
  if (!element) return false;
  if (Array.isArray(matcher)) {
    for (const singleMatcher of matcher) {
      if (matchesSelectorMatcher(element, singleMatcher) === false) return false;
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
      const classAttribute = element.getAttribute('class');
      if (!classAttribute) return false;
      return classAttribute.split(/\s+/).includes(name);
    }
    case SelectorMatcherType.Attribute:
      return value == null ? element.hasAttribute(name) : element.getAttribute(name) === value;
    case SelectorMatcherType.Pseudo:
      switch (name) {
        case 'root':
          return element.ownerDocument?.documentElement === element;
        case 'focus':
          return element.ownerDocument?.activeElement === element;
        case 'active':
          return element.hasAttribute('pressed');
        case 'hover': {
          let hovered = element.ownerDocument?.hoveredElement ?? null;

          while (hovered !== null) {
            if (hovered === element) {
              return true;
            }

            hovered = hovered.parentElement as Element | null;
          }

          return false;
        }
        case 'disabled':
          return element.hasAttribute('disabled');
        case 'enabled':
          return !element.hasAttribute('disabled');
        default:
          return false;
      }
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
