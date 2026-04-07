import type {Element} from '../classes/Element';
import type {SelectorPart} from '../types';

import {matchesSelectorPart} from './matches';

/**
 * Tests whether an element matches pre-parsed selector parts.
 *
 * This avoids the serialize → re-parse round-trip when the caller already
 * holds a parsed `SelectorPart[]` (e.g. the style engine's selector matcher).
 *
 * @param element - The element to test.
 * @param parts - Pre-parsed selector parts to match against.
 * @returns `true` when the element satisfies the selector.
 */
export function matchesParts(element: Element, parts: SelectorPart[]): boolean {
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!matchesSelectorPart(element, parts[i]!)) return false;
  }
  return true;
}
