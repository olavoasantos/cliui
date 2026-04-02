import {NodeType} from '../constants';

import type {Node} from '../classes/Node';
import type {Element} from '../classes/Element';

/** Returns whether a node is an element node at runtime. */
export function ElementNodeGuard(node: Node): node is Element {
  return node.nodeType === NodeType.ELEMENT_NODE;
}
