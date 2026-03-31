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

export class Node extends EventTarget {
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

  get localName() {
    return this[NAME];
  }

  get nodeName() {
    return this[NAME].toUpperCase();
  }

  get ownerDocument() {
    return this[OWNER_DOCUMENT];
  }

  get isConnected() {
    return this[IS_CONNECTED];
  }

  getRootNode(): Node {
    let root: Node = this;

    while (root[PARENT] != null) {
      root = root[PARENT];
    }

    return root;
  }

  isDefaultNamespace(namespace: string) {
    return namespace === NamespaceURI.XHTML;
  }

  get parentNode() {
    return this[PARENT];
  }

  set parentNode(_readonly: ParentNode | null) {}

  get parentElement(): ParentNode | null {
    const parent = this[PARENT];
    if (!parent || parent.nodeType !== 1) return null;
    return parent;
  }

  set parentElement(_readonly: ParentNode | null) {}

  get previousSibling() {
    return this[PREV];
  }

  set previousSibling(_readonly: Node | null) {}

  get nextSibling() {
    return this[NEXT];
  }

  set nextSibling(_readonly: Node | null) {}

  get previousElementSibling() {
    let sibling = this[PREV];
    while (sibling && sibling.nodeType !== 1) sibling = sibling[PREV];
    return sibling;
  }

  set previousElementSibling(_readonly: Node | null) {}

  get nextElementSibling() {
    let sibling = this[NEXT];
    while (sibling && sibling.nodeType !== 1) sibling = sibling[NEXT];
    return sibling;
  }

  set nextElementSibling(_readonly: Node | null) {}

  get firstChild() {
    return this[CHILD];
  }

  set firstChild(_readonly: Node | null) {}

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

  get nodeValue(): string | null {
    if (CharacterDataGuard(this)) return this.data;
    return null;
  }

  set nodeValue(data: string | null | undefined) {
    if (CharacterDataGuard(this)) this.data = data;
  }

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
      this.append(normalizedData);
    }
  }

  cloneNode(deep?: boolean) {
    return cloneNode(this, deep);
  }

  contains(node: Node | null) {
    let currentNode: Node | null = node;

    while (true) {
      if (currentNode == null) return false;
      if (currentNode === this) return true;
      currentNode = currentNode.parentNode;
    }
  }
}
