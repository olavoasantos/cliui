import {CHILD, OWNER_ELEMENT, NS, NEXT, HOOKS} from '../constants';
import {updateElementAttribute} from '../utilities/updateElementAttribute';

import type {Hooks, NamespaceURI} from '../types';
import type {Attr} from './Attr';
import type {Element} from './Element';

/**
 * Ordered collection of {@link Attr} nodes belonging to an Element.
 *
 * Mutations through `setNamedItem` and `removeNamedItem` trigger the hooks bridge
 * `setAttribute` and `removeAttribute` callbacks respectively.
 */
export class NamedNodeMap {
  [CHILD]: Attr | null = null;
  [OWNER_ELEMENT]: Element;

  /**
   * @param ownerElement - The element this attribute map belongs to.
   */
  constructor(ownerElement: Element) {
    this[OWNER_ELEMENT] = ownerElement;
  }

  /**
   * Returns an attribute by name.
   *
   * @param name - Attribute name.
   * @returns The matching Attr, or `null` if not found.
   */
  getNamedItem(name: string) {
    return this.getNamedItemNS(null, name);
  }

  /**
   * Returns an attribute by namespace and name.
   *
   * @param namespaceURI - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   * @returns The matching Attr, or `null` if not found.
   */
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

  /**
   * Returns the attribute at the given index.
   *
   * @param index - Zero-based index.
   * @returns The Attr at that position, or `null` if out of bounds.
   */
  item(index: number) {
    let attr = this[CHILD];
    let i = 0;
    while (attr) {
      if (i++ === index) return attr;
      attr = attr[NEXT];
    }
    return null;
  }

  /** Number of attributes in this map. */
  get length() {
    let index = 0;
    let attr = this[CHILD];
    while (attr) {
      index++;
      attr = attr[NEXT];
    }
    return index;
  }

  /**
   * Removes an attribute by name.
   *
   * @param name - Attribute name.
   * @returns The removed Attr, or `null` if not found.
   */
  removeNamedItem(name: string) {
    return this.removeNamedItemNS(null, name);
  }

  /**
   * Removes an attribute by namespace and name.
   *
   * @param namespaceURI - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   * @returns The removed Attr, or `null` if not found.
   */
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
          attr.value,
        );
        return attr;
      }

      prev = attr;
      attr = attr[NEXT];
    }

    return null;
  }

  /**
   * Adds or replaces an attribute.
   *
   * @param attr - The Attr to set. If an attribute with the same name exists, it is replaced.
   * @returns The previously existing Attr with the same name, or `null`.
   */
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
        old?.value ?? null,
      );
    }

    return old;
  }

  /**
   * Adds or replaces a namespaced attribute. Delegates to `setNamedItem`.
   *
   * @param attr - The Attr to set.
   * @returns The previously existing Attr with the same name and namespace, or `null`.
   */
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
