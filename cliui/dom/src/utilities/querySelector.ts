import {CHILD, NEXT} from '../constants';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {matchesParts} from './matchesParts';
import {parseSelector} from './parseSelector';

import type {Element} from '../classes/Element';
import type {Node} from '../classes/Node';
import type {ParentNode} from '../classes/ParentNode';
import type {SelectorPart} from '../types';

/**
 * Returns the first element within a parent node that matches a selector.
 *
 * Performs a depth-first traversal of the subtree rooted at `within`.
 *
 * @param within - The root node whose descendants are searched.
 * @param selector - A CSS selector string.
 * @returns The first matching element, or `null` when no match is found.
 */
export function querySelector(within: ParentNode, selector: string) {
  const child = within[CHILD];
  if (!child) return null;
  const parts = parseSelector(selector);
  return findMatchingElement(child, parts);
}

function findMatchingElement(node: Node, parts: SelectorPart[]): Element | null {
  if (ElementNodeGuard(node)) {
    if (matchesParts(node, parts)) return node;
    const child = node[CHILD];
    if (child) {
      const nestedMatch = findMatchingElement(child, parts);
      if (nestedMatch) return nestedMatch;
    }
  }

  const next = node[NEXT];
  return next ? findMatchingElement(next, parts) : null;
}
