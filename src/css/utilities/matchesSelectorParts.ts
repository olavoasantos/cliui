import {matches} from '../../dom/utilities/matches';
import {serializeSelectorParts} from './serializeSelectorParts';

import type {Element} from '../../dom/classes/Element';
import type {SelectorPart} from '../../dom/types';

/** Returns whether an element matches a parsed selector. */
export function matchesSelectorParts(element: Element, parts: SelectorPart[]): boolean {
  const selector = serializeSelectorParts(parts);

  if (selector.length === 0) {
    return false;
  }

  try {
    return matches(element, selector);
  } catch {
    return false;
  }
}
