import {matches} from '../../dom/utilities/selectors';
import {SelectorMatcherType} from '../../dom/types/index';

import type {Element} from '../../dom/classes/Element';
import type {SelectorPart} from '../../dom/types/index';
import type {CSSDeclaration, CSSRule} from '../types/index';

/** A matched declaration with its origin specificity and source order. */
export interface MatchedDeclaration {
  declaration: CSSDeclaration;
  specificity: [number, number, number];
  order: number;
}

/**
 * Matches CSS rules against DOM elements and returns declarations sorted by specificity.
 *
 * Given a rule list and an element, iterates all rules, determines which
 * selectors match the element, calculates specificity scores, and returns
 * all matching declarations sorted by specificity (highest first within
 * equal specificity, later rules win).
 */
export class SelectorMatcher {
  /**
   * Returns all matching declarations for an element, sorted by specificity.
   * Lower-priority declarations come first so that later entries overwrite earlier ones
   * when building a style map.
   */
  match(rules: CSSRule[], element: Element): MatchedDeclaration[] {
    const matched: MatchedDeclaration[] = [];
    let order = 0;

    for (const rule of rules) {
      let highestSpecificity: [number, number, number] | null = null;

      for (const selectorParts of rule.selectors) {
        if (matchesParts(element, selectorParts)) {
          const spec = computeSpecificity(selectorParts);
          if (!highestSpecificity || compareSpecificity(spec, highestSpecificity) > 0) {
            highestSpecificity = spec;
          }
        }
      }

      if (highestSpecificity) {
        for (const declaration of rule.declarations) {
          matched.push({
            declaration,
            specificity: highestSpecificity,
            order: order++,
          });
        }
      }
    }

    // Sort: lower specificity first, then by source order.
    // This way, higher specificity and later source order overwrite earlier entries.
    matched.sort((a, b) => {
      const cmp = compareSpecificity(a.specificity, b.specificity);
      if (cmp !== 0) return cmp;
      return a.order - b.order;
    });

    return matched;
  }
}

/**
 * Tests whether an element matches a parsed selector (array of SelectorParts).
 * Reconstructs the selector string and delegates to the DOM `matches()` utility.
 */
function matchesParts(element: Element, parts: SelectorPart[]): boolean {
  const selectorStr = serializeParts(parts);
  if (!selectorStr) return false;
  try {
    return matches(element, selectorStr);
  } catch {
    return false;
  }
}

/**
 * Computes the specificity of a parsed selector as a [a, b, c] tuple:
 * - a: count of ID selectors
 * - b: count of class selectors, attribute selectors, and pseudo-classes
 * - c: count of element selectors and pseudo-elements
 */
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
          // :not() and :has() — the specificity of their argument counts
          if (matcher.value) {
            // Parse the inner selector and add its specificity
            // For simplicity, treat :not/.has argument as contributing to b
            b++;
          }
          break;
        // Unknown (*) contributes 0
      }
    }
  }

  return [a, b, c];
}

/**
 * Compares two specificity tuples. Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareSpecificity(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Serializes parsed selector parts back into a selector string.
 * This is needed because the DOM `matches()` utility takes a string.
 */
function serializeParts(parts: SelectorPart[]): string {
  const segments: string[] = [];

  for (const part of parts) {
    let segment = '';

    for (const matcher of part.matchers) {
      switch (matcher.type) {
        case SelectorMatcherType.Unknown:
          segment += '*';
          break;
        case SelectorMatcherType.Element:
          segment += matcher.name;
          break;
        case SelectorMatcherType.Id:
          segment += `#${matcher.name}`;
          break;
        case SelectorMatcherType.Class:
          segment += `.${matcher.name}`;
          break;
        case SelectorMatcherType.Attribute:
          segment +=
            matcher.value != null ? `[${matcher.name}="${matcher.value}"]` : `[${matcher.name}]`;
          break;
        case SelectorMatcherType.Pseudo:
          segment += `:${matcher.name}`;
          break;
        case SelectorMatcherType.Function:
          segment += `:${matcher.name}(${matcher.value ?? ''})`;
          break;
      }
    }

    segments.push(segment);
  }

  // Rebuild with combinators between segments.
  // parseSelector stores the combinator on the part that *precedes* the next part.
  // parts[0].combinator applies between parts[0] and parts[1], etc.
  // The last part always has combinator Inner (compound/same element).
  if (segments.length === 0) return '';

  let result = segments[0]!;
  for (let i = 0; i < parts.length - 1; i++) {
    const comb = parts[i]!.combinator;
    let combStr: string;
    switch (comb) {
      case 0: // Descendant
        combStr = ' ';
        break;
      case 1: // Child
        combStr = ' > ';
        break;
      case 2: // Sibling
        combStr = ' ~ ';
        break;
      case 3: // Adjacent
        combStr = ' + ';
        break;
      default: // Inner (compound — no separator)
        combStr = '';
        break;
    }
    result += combStr + segments[i + 1]!;
  }

  return result;
}
