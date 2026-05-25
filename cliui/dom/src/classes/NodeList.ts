import type {Node} from './Node';

/**
 * Array-like list of DOM nodes returned by `childNodes` and `querySelectorAll`.
 */
export class NodeList extends Array<Node> {
  /**
   * Returns the node at the given index.
   *
   * @param index - Zero-based index.
   * @returns The node at that position, or `undefined` if out of bounds.
   */
  item(index: number) {
    return this[index];
  }
}
