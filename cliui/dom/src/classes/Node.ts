import {
  CHILD,
  HOOKS,
  IS_CONNECTED,
  NAME,
  NamespaceURI,
  NEXT,
  NodeType,
  OWNER_DOCUMENT,
  PARENT,
  PREV,
} from '../constants';
import {CharacterDataGuard} from '../guards/CharacterDataGuard';
import {ParentNodeGuard} from '../guards/ParentNodeGuard';
import {TextNodeGuard} from '../guards/TextNodeGuard';
import {cloneNode} from '../utilities/cloneNode';
import {descendants} from '../utilities/descendants';
import {EventTarget} from './EventTarget';

import type {Document} from './Document';
import type {ParentNode} from './ParentNode';
import type {Hooks, NodeType as NodeTypeValue} from '../types';

/**
 * Abstract base for all DOM nodes. Provides tree traversal, node identity, and content access.
 *
 * @see {@link ParentNode} for child-management operations.
 * @see {@link ChildNode} for self-removal and sibling-insertion operations.
 */
export class Node extends EventTarget {
  /** Node type constant for element nodes (1). */
  static readonly ELEMENT_NODE = NodeType.ELEMENT_NODE;
  /** Node type constant for attribute nodes (2). */
  static readonly ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE;
  /** Node type constant for text nodes (3). */
  static readonly TEXT_NODE = NodeType.TEXT_NODE;
  /** Node type constant for CDATA section nodes (4). */
  static readonly CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE;
  /** Node type constant for comment nodes (8). */
  static readonly COMMENT_NODE = NodeType.COMMENT_NODE;
  /** Node type constant for document nodes (9). */
  static readonly DOCUMENT_NODE = NodeType.DOCUMENT_NODE;
  /** Node type constant for document type nodes (10). */
  static readonly DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE;
  /** Node type constant for document fragment nodes (11). */
  static readonly DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE;

  /** Numeric node type identifier for this node. */
  nodeType: NodeTypeValue = NodeType.NODE;

  [OWNER_DOCUMENT]!: Document;
  [NAME] = '';
  [PARENT]: ParentNode | null = null;
  [CHILD]: Node | null = null;
  [PREV]: Node | null = null;
  [NEXT]: Node | null = null;
  [IS_CONNECTED] = false;

  protected get [HOOKS](): Partial<Hooks> {
    return this[OWNER_DOCUMENT].defaultView[HOOKS];
  }

  /** Lowercase tag name for element nodes; implementation-defined for other node types. */
  get localName() {
    return this[NAME];
  }

  /** Uppercase tag name for element nodes; type-specific name (e.g. `#text`, `#comment`) for others. */
  get nodeName() {
    if (this.nodeType === NodeType.ELEMENT_NODE) {
      return this[NAME].toUpperCase();
    }
    return this[NAME];
  }

  /** Document that owns this node. */
  get ownerDocument() {
    return this[OWNER_DOCUMENT];
  }

  /** Whether this node is connected to a Document (i.e. in the document tree). */
  get isConnected() {
    return this[IS_CONNECTED];
  }

  /**
   * Returns the topmost ancestor of this node.
   *
   * @returns The root node, or this node itself if it has no parent.
   */
  getRootNode(): Node {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- walking up the tree requires reassignment
    let root: Node = this;

    while (root[PARENT] != null) {
      root = root[PARENT];
    }

    return root;
  }

  /**
   * Checks whether the given namespace URI is the default namespace.
   *
   * @param namespace - Namespace URI to check.
   * @returns `true` if the namespace is the XHTML namespace.
   */
  isDefaultNamespace(namespace: string) {
    return namespace === NamespaceURI.XHTML;
  }

  /** Parent node, or `null` if this node is detached or is the root. */
  get parentNode() {
    return this[PARENT];
  }

  set parentNode(_readonly: ParentNode | null) {}

  /** Parent element, or `null` if the parent is not an element or does not exist. */
  get parentElement(): ParentNode | null {
    const parent = this[PARENT];
    if (!parent || parent.nodeType !== 1) return null;
    return parent;
  }

  set parentElement(_readonly: ParentNode | null) {}

  /** Previous sibling node, or `null` if this is the first child. */
  get previousSibling() {
    return this[PREV];
  }

  set previousSibling(_readonly: Node | null) {}

  /** Next sibling node, or `null` if this is the last child. */
  get nextSibling() {
    return this[NEXT];
  }

  set nextSibling(_readonly: Node | null) {}

  /** Previous sibling that is an element, or `null` if none exists. */
  get previousElementSibling() {
    let sibling = this[PREV];
    while (sibling && sibling.nodeType !== 1) sibling = sibling[PREV];
    return sibling;
  }

  set previousElementSibling(_readonly: Node | null) {}

  /** Next sibling that is an element, or `null` if none exists. */
  get nextElementSibling() {
    let sibling = this[NEXT];
    while (sibling && sibling.nodeType !== 1) sibling = sibling[NEXT];
    return sibling;
  }

  set nextElementSibling(_readonly: Node | null) {}

  /** First child node, or `null` if this node has no children. */
  get firstChild() {
    return this[CHILD];
  }

  set firstChild(_readonly: Node | null) {}

  /** Last child node, or `null` if this node has no children. */
  get lastChild() {
    let child = this[CHILD];
    while (child) {
      const next = child[NEXT];
      if (next == null) break;
      child = next;
    }
    return child;
  }

  set lastChild(_readonly: Node | null) {}

  /**
   * Character data for text-bearing nodes (`Text`, `Comment`). Returns `null` for other node types.
   */
  get nodeValue(): string | null {
    if (CharacterDataGuard(this)) return this.data;
    return null;
  }

  /** Sets the character data on text-bearing nodes. No-op for other node types. */
  set nodeValue(data: string | null | undefined) {
    if (CharacterDataGuard(this)) this.data = data;
  }

  /**
   * Concatenated text content of this node and all its descendants.
   * Returns `data` directly for text-bearing nodes.
   */
  get textContent(): string | null {
    if (CharacterDataGuard(this)) return this.data;
    let text = '';

    for (const node of descendants(this)) {
      if (TextNodeGuard(node)) {
        text += node.data;
      }
    }

    return text;
  }

  /**
   * Replaces all children with a single text node containing the given value.
   * On text-bearing nodes, sets `data` directly. A `null` or empty value removes all children.
   */
  set textContent(data: unknown) {
    if (CharacterDataGuard(this)) {
      this.data = data;
    } else if (ParentNodeGuard(this)) {
      const normalizedData = data == null ? '' : String(data);
      const onlyChild = this[CHILD];

      if (
        normalizedData.length > 0 &&
        onlyChild !== null &&
        onlyChild[NEXT] === null &&
        TextNodeGuard(onlyChild)
      ) {
        if (onlyChild.data !== normalizedData) {
          onlyChild.data = normalizedData;
        }

        return;
      }

      let child;
      while ((child = this[CHILD])) {
        this.removeChild(child);
      }
      if (normalizedData.length > 0) {
        this.append(normalizedData);
      }
    }
  }

  /**
   * Creates a copy of this node.
   *
   * @param deep - When `true`, clones the entire subtree. Defaults to a shallow clone.
   * @returns The cloned node. The clone has no parent.
   */
  cloneNode(deep?: boolean) {
    return cloneNode(this, deep);
  }

  /**
   * Checks whether a node is a descendant of this node (or is this node itself).
   *
   * @param node - The node to test. Returns `false` if `null`.
   * @returns `true` if the node is this node or a descendant of it.
   */
  contains(node: Node | null) {
    let currentNode: Node | null = node;

    while (true) {
      if (currentNode == null) return false;
      if (currentNode === this) return true;
      currentNode = currentNode.parentNode;
    }
  }
}
