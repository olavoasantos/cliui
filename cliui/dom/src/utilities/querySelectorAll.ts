import {CHILD, NEXT} from '../constants';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {matches} from './matches';

import type {Node} from '../classes/Node';
import type {Element} from '../classes/Element';
import type {ParentNode} from '../classes/ParentNode';

/** Returns all elements within a parent node that match a selector. */
export function querySelectorAll(within: ParentNode, selector: string) {
  const results: Element[] = [];
  const child = within[CHILD];
  if (!child) return results;
  collectMatchingElements(child, selector, results);
  return results;
}

function collectMatchingElements(node: Node, selector: string, results: Element[]) {
  if (ElementNodeGuard(node)) {
    if (matches(node, selector)) {
      results.push(node);
    }

    const child = node[CHILD];
    if (child) {
      collectMatchingElements(child, selector, results);
    }
  }

  const next = node[NEXT];
  if (next) {
    collectMatchingElements(next, selector, results);
  }
}
