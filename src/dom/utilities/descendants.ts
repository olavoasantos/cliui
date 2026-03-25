import {CHILD, NEXT} from '../constants';

import type {Node} from '../classes/Node';

/** Returns all descendant nodes in depth-first order. */
export function descendants(node: Node) {
  const nodes: Node[] = [];

  const walk = (currentNode: Node) => {
    nodes.push(currentNode);
    const child = currentNode[CHILD];
    if (child) walk(child);
    const sibling = currentNode[NEXT];
    if (sibling) walk(sibling);
  };

  const child = node[CHILD];
  if (child) walk(child);

  return nodes;
}
