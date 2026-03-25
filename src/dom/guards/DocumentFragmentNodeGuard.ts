import {NodeType} from '../constants';

import type {Node} from '../classes/Node';
import type {DocumentFragment} from '../classes/DocumentFragment';

/** Returns whether a node is a document fragment node at runtime. */
export function DocumentFragmentNodeGuard(node: Node): node is DocumentFragment {
  return node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE;
}
