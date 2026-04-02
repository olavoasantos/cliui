import {OWNER_DOCUMENT} from '../constants';
import {ParentNodeGuard} from '../guards/ParentNodeGuard';

import type {Document} from '../classes/Document';
import type {Node} from '../classes/Node';

/** Reassigns a node subtree to a new owner document. */
export function adoptNode(node: Node, document: Document) {
  node[OWNER_DOCUMENT] = document;

  if (!ParentNodeGuard(node)) return;

  for (const child of node.childNodes) {
    adoptNode(child, document);
  }
}
