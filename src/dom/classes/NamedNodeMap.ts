import {CHILD, OWNER_ELEMENT, NS, NEXT, HOOKS} from '../constants';
import {updateElementAttribute} from '../utilities/updateElementAttribute';

import type {NamespaceURI} from '../types';
import type {Hooks} from '../types';
import type {Attr} from './Attr';
import type {Element} from './Element';

export class NamedNodeMap {
  [CHILD]: Attr | null = null;
  [OWNER_ELEMENT]: Element;

  constructor(ownerElement: Element) {
    this[OWNER_ELEMENT] = ownerElement;
  }

  getNamedItem(name: string) {
    return this.getNamedItemNS(null, name);
  }

  getNamedItemNS(namespaceURI: NamespaceURI | null, name: string) {
    let attr = this[CHILD];
    while (attr) {
      if (attr.name === name && attr[NS] == namespaceURI) {
        return attr;
      }
      attr = attr[NEXT];
    }
    return null;
  }

  item(index: number) {
    let attr = this[CHILD];
    let i = 0;
    while (attr) {
      if (i++ === index) return attr;
      attr = attr[NEXT];
    }
    return null;
  }

  get length() {
    let index = 0;
    let attr = this[CHILD];
    while (attr) {
      index++;
      attr = attr[NEXT];
    }
    return index;
  }

  removeNamedItem(name: string) {
    return this.removeNamedItemNS(null, name);
  }

  removeNamedItemNS(namespaceURI: NamespaceURI | null, name: string) {
    const ownerElement = this[OWNER_ELEMENT];
    let attr = this[CHILD];
    let prev: typeof attr | null = null;

    while (attr != null) {
      if (attr.name === name && attr[NS] == namespaceURI) {
        if (prev) prev[NEXT] = attr[NEXT];
        if (this[CHILD] === attr) this[CHILD] = attr[NEXT];
        updateElementAttribute(ownerElement, attr.name, attr.value, null);
        (ownerElement[HOOKS] as Partial<Hooks>).removeAttribute?.(
          ownerElement as never,
          name,
          namespaceURI,
        );
        return attr;
      }

      prev = attr;
      attr = attr[NEXT];
    }

    return null;
  }

  setNamedItem(attr: Attr) {
    const ownerElement = this[OWNER_ELEMENT];
    let old = null;
    let child = this[CHILD];
    attr[OWNER_ELEMENT] = ownerElement;
    if (child == null) {
      this[CHILD] = attr;
    } else {
      let prev;
      while (child) {
        if (child.name === attr.name && child[NS] == attr[NS]) {
          if (prev) prev[NEXT] = attr;
          else this[CHILD] = attr;
          attr[NEXT] = child[NEXT];
          child[NEXT] = null;
          old = child;
          break;
        }
        prev = child;
        child = child[NEXT];
      }
      if (prev) prev[NEXT] = attr;
      else this[CHILD] = attr;
    }

    if (!old || old.value !== attr.value) {
      updateElementAttribute(ownerElement, attr.name, old?.value ?? null, attr.value);

      (ownerElement[HOOKS] as Partial<Hooks>).setAttribute?.(
        ownerElement as never,
        attr.name,
        attr.value,
        attr[NS],
      );
    }

    return old;
  }

  setNamedItemNS(attr: Attr) {
    return this.setNamedItem(attr);
  }

  *[Symbol.iterator]() {
    let attr = this[CHILD];
    while (attr) {
      yield attr;
      attr = attr[NEXT];
    }
  }
}
