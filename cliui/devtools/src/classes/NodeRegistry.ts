import type {Node as DomNode} from '@cliui/dom';

/**
 * Bidirectional registry mapping DOM nodes to unique integer IDs for CDP.
 *
 * CDP operates on integer `nodeId` values — every DOM method references
 * nodes by ID, not by object reference.  This registry assigns IDs on
 * first encounter and provides lookup in both directions.
 */
export class NodeRegistry {
  private nextId = 1;
  private readonly nodeToId = new Map<DomNode, number>();
  private readonly idToNode = new Map<number, DomNode>();

  /**
   * Returns the ID for a node, assigning one if this is the first encounter.
   *
   * @param node - The DOM node to register.
   * @returns The integer ID assigned to the node.
   */
  register(node: DomNode): number {
    const existing = this.nodeToId.get(node);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.nextId++;
    this.nodeToId.set(node, id);
    this.idToNode.set(id, node);
    return id;
  }

  /**
   * Returns the ID for a node, or `undefined` if not registered.
   *
   * @param node - The DOM node to look up.
   */
  getId(node: DomNode): number | undefined {
    return this.nodeToId.get(node);
  }

  /**
   * Returns the DOM node for a given ID, or `undefined` if not registered.
   *
   * @param id - The integer node ID.
   */
  getNode(id: number): DomNode | undefined {
    return this.idToNode.get(id);
  }

  /**
   * Returns `true` if the node has been registered.
   *
   * @param node - The DOM node to check.
   */
  has(node: DomNode): boolean {
    return this.nodeToId.has(node);
  }

  /**
   * Removes a node from the registry, freeing its ID mapping.
   *
   * Called when nodes are removed from the tree to prevent memory leaks.
   *
   * @param node - The DOM node to unregister.
   */
  unregister(node: DomNode): void {
    const id = this.nodeToId.get(node);
    if (id !== undefined) {
      this.nodeToId.delete(node);
      this.idToNode.delete(id);
    }
  }

  /**
   * Recursively unregisters a node and all its descendants.
   *
   * @param node - The root node to unregister.
   */
  unregisterSubtree(node: DomNode): void {
    this.unregister(node);
    const children = (node as any).childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        this.unregisterSubtree(children[i]);
      }
    }
  }

  /** Returns the total number of registered nodes. */
  get size(): number {
    return this.nodeToId.size;
  }

  /** Removes all mappings. */
  clear(): void {
    this.nodeToId.clear();
    this.idToNode.clear();
    this.nextId = 1;
  }
}
