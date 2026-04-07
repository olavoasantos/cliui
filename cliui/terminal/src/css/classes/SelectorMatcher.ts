import {compareSpecificity} from '../utilities/compareSpecificity';
import {computeSpecificity} from '../utilities/computeSpecificity';
import {matchesSelectorParts} from '../utilities/matchesSelectorParts';

import type {Element} from '@cliui/dom';
import type {MatchedDeclaration} from '../types';
import type {CSSRule} from '../types';

/** Matches CSS rules against DOM elements and returns declarations sorted by specificity. */
export class SelectorMatcher {
  match(rules: CSSRule[], element: Element): MatchedDeclaration[] {
    const matched: MatchedDeclaration[] = [];
    let order = 0;

    for (let i = 0, rulesLen = rules.length; i < rulesLen; i++) {
      const rule = rules[i];
      let highestSpecificity: [number, number, number] | null = null;
      const selectors = rule.selectors;

      for (let j = 0, selLen = selectors.length; j < selLen; j++) {
        const selectorParts = selectors[j];
        if (matchesSelectorParts(element, selectorParts)) {
          // We attach specificity to the selector array to avoid WeakMap overhead.
          let specificity = (selectorParts as any)._specificity as
            | [number, number, number]
            | undefined;

          if (specificity === undefined) {
            specificity = computeSpecificity(selectorParts);
            (selectorParts as any)._specificity = specificity;
          }

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

      const declarations = rule.declarations;
      for (let j = 0, declLen = declarations.length; j < declLen; j++) {
        matched.push({declaration: declarations[j], specificity: highestSpecificity, order});
        order += 1;
      }
    }

    if (matched.length > 1) {
      matched.sort((left, right) => {
        const comparison = compareSpecificity(left.specificity, right.specificity);

        if (comparison !== 0) {
          return comparison;
        }

        return left.order - right.order;
      });
    }

    return matched;
  }
}
