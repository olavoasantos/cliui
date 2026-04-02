import {CHILD, NEXT} from '../constants';
import {serializeNode} from './serializeNode';

import type {ParentNode} from '../classes/ParentNode';

/** Serializes all children of a parent node to HTML. */
export function serializeChildren(parentNode: ParentNode) {
  let output = '';
  let child = parentNode[CHILD];
  while (child) {
    output += serializeNode(child);
    child = child[NEXT];
  }
  return output;
}
