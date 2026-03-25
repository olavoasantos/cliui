import {Node} from '../classes/Node';

import type {ParentNode} from '../classes/ParentNode';

/** Normalizes a parent appendable value into a concrete node instance. */
export function toNode(parent: ParentNode, node: Node | unknown) {
  if (node instanceof Node) return node;
  return parent.ownerDocument.createTextNode(String(node));
}
