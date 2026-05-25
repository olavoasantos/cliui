import {CHILD, NEXT} from '../constants';
import {serializeNode} from './serializeNode';

import type {ParentNode} from '../classes/ParentNode';

/**
 * Serializes all child nodes of a parent node to an HTML string.
 *
 * Concatenates the serialized output of each child in document order.
 *
 * @param parentNode - The parent whose children are serialized.
 * @returns The concatenated HTML string of all children.
 */
export function serializeChildren(parentNode: ParentNode) {
  let output = '';
  let child = parentNode[CHILD];
  while (child) {
    output += serializeNode(child);
    child = child[NEXT];
  }
  return output;
}
