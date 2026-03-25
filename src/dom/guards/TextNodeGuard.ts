import {NodeType} from '../constants';

import type {Node} from '../classes/Node';
import type {Text} from '../classes/Text';

/** Returns whether a node is a text node at runtime. */
export function TextNodeGuard(node: Node): node is Text {
  return node.nodeType === NodeType.TEXT_NODE;
}
