import {matchesParts} from '@cliui/dom';

import type {Element} from '@cliui/dom';
import type {SelectorPart} from '@cliui/dom';

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
