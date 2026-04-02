import {NodeType} from '../constants';

import type {Node} from '../classes/Node';
import type {Comment} from '../classes/Comment';

/** Returns whether a node is a comment node at runtime. */
export function CommentNodeGuard(node: Node): node is Comment {
  return node.nodeType === NodeType.COMMENT_NODE;
}
