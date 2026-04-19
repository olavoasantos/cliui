import {descendants} from './descendants';
import type {Node} from '../classes/Node';

/** Returns a node followed by all of its descendants in depth-first order. */
export function selfAndDescendants(node: Node) {
  const nodes: Node[] = descendants(node);
  nodes.unshift(node);

  return nodes;
}
