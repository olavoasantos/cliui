import {SelectorCombinator, SelectorMatcherType} from '../../dom/constants';
import {matches} from '../../dom/utilities/matches';

import type {Element} from '../../dom/classes/Element';
import type {SelectorPart} from '../../dom/types';
import type {CSSDeclaration, CSSRule} from '../types';

/** A matched declaration with its origin specificity and source order. */
export interface MatchedDeclaration {
  declaration: CSSDeclaration;
  specificity: [number, number, number];
  order: number;
}

/** Matches CSS rules against DOM elements and returns declarations sorted by specificity. */
export class SelectorMatcher {
  match(rules: CSSRule[], element: Element): MatchedDeclaration[] {
    const matched: MatchedDeclaration[] = [];
    let order = 0;

    for (const rule of rules) {
      let highestSpecificity: [number, number, number] | null = null;

      for (const selectorParts of rule.selectors) {
        if (matchesParts(element, selectorParts)) {
          const specificity = computeSpecificity(selectorParts);
          if (!highestSpecificity || compareSpecificity(specificity, highestSpecificity) > 0) {
            highestSpecificity = specificity;
          }
        }
      }

      if (!highestSpecificity) continue;

      for (const declaration of rule.declarations) {
        matched.push({declaration, specificity: highestSpecificity, order: order++});
      }
    }

    matched.sort((a, b) => {
      const comparison = compareSpecificity(a.specificity, b.specificity);
      if (comparison !== 0) return comparison;
      return a.order - b.order;
    });

    return matched;
  }
}

function matchesParts(element: Element, parts: SelectorPart[]): boolean {
  const selector = serializeParts(parts);
  if (!selector) return false;
  try {
    return matches(element, selector);
  } catch {
    return false;
  }
}

function computeSpecificity(parts: SelectorPart[]): [number, number, number] {
  let a = 0;
  let b = 0;
  let c = 0;

  for (const part of parts) {
    for (const matcher of part.matchers) {
      switch (matcher.type) {
        case SelectorMatcherType.Id:
          a++;
          break;
        case SelectorMatcherType.Class:
        case SelectorMatcherType.Attribute:
        case SelectorMatcherType.Pseudo:
          b++;
          break;
        case SelectorMatcherType.Element:
          c++;
          break;
        case SelectorMatcherType.Function:
          if (matcher.value) b++;
          break;
      }
    }
  }

  return [a, b, c];
}

function compareSpecificity(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function serializeParts(parts: SelectorPart[]): string {
  const segments = parts.map((part) =>
    part.matchers
      .map((matcher) => {
        switch (matcher.type) {
          case SelectorMatcherType.Unknown:
            return '*';
          case SelectorMatcherType.Element:
            return matcher.name;
          case SelectorMatcherType.Id:
            return `#${matcher.name}`;
          case SelectorMatcherType.Class:
            return `.${matcher.name}`;
          case SelectorMatcherType.Attribute:
            return matcher.value != null
              ? `[${matcher.name}="${matcher.value}"]`
              : `[${matcher.name}]`;
          case SelectorMatcherType.Pseudo:
            return `:${matcher.name}`;
          case SelectorMatcherType.Function:
            return `:${matcher.name}(${matcher.value ?? ''})`;
        }
      })
      .join(''),
  );

  if (segments.length === 0) return '';

  let result = segments[0]!;
  for (let index = 0; index < parts.length - 1; index++) {
    switch (parts[index]!.combinator) {
      case SelectorCombinator.Descendant:
        result += ' ';
        break;
      case SelectorCombinator.Child:
        result += ' > ';
        break;
      case SelectorCombinator.Sibling:
        result += ' ~ ';
        break;
      case SelectorCombinator.Adjacent:
        result += ' + ';
        break;
    }
    result += segments[index + 1]!;
  }

  return result;
}
