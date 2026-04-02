import {CHILD, NEXT} from '../constants';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {matches} from './matches';

import type {Element} from '../classes/Element';
import type {Node} from '../classes/Node';
import type {ParentNode} from '../classes/ParentNode';

/** Returns the first element within a parent node that matches a selector. */
export function querySelector(within: ParentNode, selector: string) {
  const child = within[CHILD];
  if (!child) return null;
  return findMatchingElement(child, selector);
}

function findMatchingElement(node: Node, selector: string): Element | null {
  if (ElementNodeGuard(node)) {
    if (matches(node, selector)) return node;
    const child = node[CHILD];
    if (child) {
      const nestedMatch = findMatchingElement(child, selector);
      if (nestedMatch) return nestedMatch;
    }
  }

  const next = node[NEXT];
  return next ? findMatchingElement(next, selector) : null;
}
