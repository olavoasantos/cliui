import {NEXT} from '../constants';
import {toNode} from '../utilities/toNode';
import {Node} from './Node';

/**
 * Mixin providing self-removal and sibling-insertion operations.
 *
 * All methods are no-ops when the node has no parent.
 */
export class ChildNode extends Node {
  /** Removes this node from its parent. No-op if the node is detached. */
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.removeChild(this);
  }

  /**
   * Replaces this node with one or more nodes or strings. Strings are converted to text nodes.
   * If no arguments are provided, removes this node. No-op if detached.
   *
   * @param nodes - Replacement nodes or strings.
   */
  replaceWith(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    if (nodes.length === 0) {
      parent.removeChild(this);
      return;
    }
    const next = this[NEXT];
    const node = toNode(parent, nodes[0]);
    parent.replaceChild(node, this);
    for (let index = 1; index < nodes.length; index++) {
      parent.insertBefore(toNode(parent, nodes[index]), next);
    }
  }

  /**
   * Inserts one or more nodes or strings immediately before this node. No-op if detached.
   *
   * @param nodes - Nodes or strings to insert. Strings are converted to text nodes.
   */
  before(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), this);
    }
  }

  /**
   * Inserts one or more nodes or strings immediately after this node. No-op if detached.
   *
   * @param nodes - Nodes or strings to insert. Strings are converted to text nodes.
   */
  after(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    const next = this[NEXT];
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), next);
    }
  }
}
