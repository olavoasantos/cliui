import {
  OWNER_DOCUMENT,
  NAME,
  PARENT,
  CHILD,
  PREV,
  NEXT,
  NamespaceURI,
  NodeType,
  HOOKS,
  IS_CONNECTED,
} from '../constants/index';
import type {Document} from './Document';
import type {ParentNode} from './ParentNode';
import type {Hooks} from '../types/index';
import {EventTarget} from './EventTarget';
import {
  isCharacterData,
  isParentNode,
  isTextNode,
  cloneNode,
  descendants,
} from '../utilities/shared';

export class Node extends EventTarget {
  nodeType: NodeType = NodeType.NODE;

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
    let sib = this[PREV];
    while (sib && sib.nodeType !== 1) sib = sib[PREV];
    return sib;
  }

  set previousElementSibling(_readonly: Node | null) {}

  get nextElementSibling() {
    let sib = this[NEXT];
    while (sib && sib.nodeType !== 1) sib = sib[NEXT];
    return sib;
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
    if (isCharacterData(this)) return this.data;
    return null;
  }

  set nodeValue(data: string | null | undefined) {
    if (isCharacterData(this)) this.data = data;
  }

  get textContent(): string | null {
    if (isCharacterData(this)) return this.data;
    let text = '';

    for (const node of descendants(this)) {
      if (isTextNode(node)) {
        text += node.data;
      }
    }

    return text;
  }

  set textContent(data: unknown) {
    if (isCharacterData(this)) {
      this.data = data;
    } else if (isParentNode(this)) {
      let child;
      while ((child = this[CHILD])) {
        this.removeChild(child);
      }
      this.append(data as string);
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
