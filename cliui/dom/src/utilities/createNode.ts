import {OWNER_DOCUMENT} from '../constants';

import type {Document} from '../classes/Document';
import type {Node} from '../classes/Node';

/** Associates a node with an owner document. */
export function createNode<T extends Node>(node: T, ownerDocument: Document) {
  Object.defineProperty(node, OWNER_DOCUMENT, {
    value: ownerDocument,
    writable: true,
    enumerable: false,
  });

  return node;
}
