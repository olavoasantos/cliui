import type {Node} from './Node';

export class NodeList extends Array<Node> {
  item(index: number) {
    return this[index];
  }
}
