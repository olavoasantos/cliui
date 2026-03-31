import {matchesParts} from '../../dom/utilities/matches';

import type {Element} from '../../dom/classes/Element';
import type {SelectorPart} from '../../dom/types';

/** Returns whether an element matches a parsed selector. */
export function matchesSelectorParts(element: Element, parts: SelectorPart[]): boolean {
  if (parts.length === 0) {
    return false;
  }

  try {
    return matchesParts(element, parts);
  } catch {
    return false;
  }
}
