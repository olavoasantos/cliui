import {SelectorMatcherType} from '../../dom/constants';

import type {SelectorPart} from '../../dom/types';

/** Computes CSS specificity for a parsed selector. */
export function computeSpecificity(parts: SelectorPart[]): [number, number, number] {
  let a = 0;
  let b = 0;
  let c = 0;

  for (const part of parts) {
    for (const matcher of part.matchers) {
      switch (matcher.type) {
        case SelectorMatcherType.Id:
          a += 1;
          break;
        case SelectorMatcherType.Class:
        case SelectorMatcherType.Attribute:
        case SelectorMatcherType.Pseudo:
          b += 1;
          break;
        case SelectorMatcherType.Element:
          c += 1;
          break;
        case SelectorMatcherType.Function:
          if (matcher.value) {
            b += 1;
          }
          break;
      }
    }
  }

  return [a, b, c];
}
