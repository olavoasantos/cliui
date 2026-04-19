import {NEXT} from '../constants';
import {toNode} from '../utilities/toNode';
import {Node} from './Node';

export class ChildNode extends Node {
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.removeChild(this);
  }

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

  before(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), this);
    }
  }

  after(...nodes: (Node | string)[]) {
    const parent = this.parentNode;
    if (!parent) return;
    const next = this[NEXT];
    for (const node of nodes) {
      parent.insertBefore(toNode(parent, node), next);
    }
  }
}
