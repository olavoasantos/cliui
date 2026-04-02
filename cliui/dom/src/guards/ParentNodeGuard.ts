import type {Node} from '../classes/Node';
import type {ParentNode} from '../classes/ParentNode';

/** Returns whether a node exposes the ParentNode mutation API at runtime. */
export function ParentNodeGuard(node: Node): node is ParentNode {
  return 'appendChild' in node;
}
