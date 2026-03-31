import {compareSpecificity} from '../utilities/compareSpecificity';
import {computeSpecificity} from '../utilities/computeSpecificity';
import {matchesSelectorParts} from '../utilities/matchesSelectorParts';

import type {Element} from '../../dom/classes/Element';
import type {SelectorPart} from '../../dom/types';
import type {MatchedDeclaration} from '../types/MatchedDeclaration';
import type {CSSRule} from '../types';

/** Pre-computed specificity cached per selector part array (by identity). */
const specificityCache = new WeakMap<SelectorPart[], [number, number, number]>();

/** Returns the specificity for a selector, computing and caching it if needed. */
function getCachedSpecificity(parts: SelectorPart[]): [number, number, number] {
  let result = specificityCache.get(parts);

  if (result === undefined) {
    result = computeSpecificity(parts);
    specificityCache.set(parts, result);
  }

  return result;
}

/** Matches CSS rules against DOM elements and returns declarations sorted by specificity. */
export class SelectorMatcher {
  match(rules: CSSRule[], element: Element): MatchedDeclaration[] {
    const matched: MatchedDeclaration[] = [];
    let order = 0;

    for (const rule of rules) {
      let highestSpecificity: [number, number, number] | null = null;

      for (const selectorParts of rule.selectors) {
        if (matchesSelectorParts(element, selectorParts)) {
          const specificity = getCachedSpecificity(selectorParts);

          if (
            highestSpecificity === null ||
            compareSpecificity(specificity, highestSpecificity) > 0
          ) {
            highestSpecificity = specificity;
          }
        }
      }

      if (highestSpecificity === null) {
        continue;
      }

      for (const declaration of rule.declarations) {
        matched.push({declaration, specificity: highestSpecificity, order});
        order += 1;
      }
    }

    matched.sort((left, right) => {
      const comparison = compareSpecificity(left.specificity, right.specificity);

      if (comparison !== 0) {
        return comparison;
      }

      return left.order - right.order;
    });

    return matched;
  }
}
