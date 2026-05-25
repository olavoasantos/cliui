import {CHILD, NEXT} from '../constants';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {matchesParts} from './matchesParts';
import {parseSelector} from './parseSelector';

import type {Node} from '../classes/Node';
import type {Element} from '../classes/Element';
import type {ParentNode} from '../classes/ParentNode';
import type {SelectorPart} from '../types';

/**
 * Returns all elements within a parent node that match a selector.
 *
 * Performs a depth-first traversal of the subtree rooted at `within`
 * and collects every matching element in document order.
 *
 * @param within - The root node whose descendants are searched.
 * @param selector - A CSS selector string.
 * @returns An array of matching elements. Empty when no matches are found.
 */
export function querySelectorAll(within: ParentNode, selector: string) {
  const results: Element[] = [];
  const child = within[CHILD];
  if (!child) return results;
  const parts = parseSelector(selector);
  collectMatchingElements(child, parts, results);
  return results;
}

function collectMatchingElements(node: Node, parts: SelectorPart[], results: Element[]) {
  if (ElementNodeGuard(node)) {
    if (matchesParts(node, parts)) results.push(node);
    const child = node[CHILD];
    if (child) collectMatchingElements(child, parts, results);
  }

  const next = node[NEXT];
  if (next) collectMatchingElements(next, parts, results);
}
