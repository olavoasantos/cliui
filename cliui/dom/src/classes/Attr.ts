import {NS, NEXT, VALUE, OWNER_ELEMENT, NAME, NodeType, HOOKS} from '../constants';
import type {Hooks, NamespaceURI} from '../types';
import type {Element} from './Element';
import {Node} from './Node';

/**
 * Represents a single attribute on an Element.
 *
 * Setting `value` triggers the hooks bridge `setAttribute` callback on the owner element.
 */
export class Attr extends Node {
  override nodeType = NodeType.ATTRIBUTE_NODE;
  [NS]: NamespaceURI | null = null;
  [NEXT]: Attr | null = null;
  [VALUE]: string;
  [OWNER_ELEMENT]: Element | null = null;

  /**
   * @param name - Attribute name.
   * @param value - Attribute value.
   * @param namespace - Optional namespace URI for the attribute.
   */
  constructor(name: string, value: string, namespace?: NamespaceURI | null) {
    super();
    this[NAME] = name;
    this[VALUE] = value;
    if (namespace) this[NS] = namespace;
  }

  /** Attribute name. Alias for `name`. */
  get nodeName() {
    return this[NAME];
  }

  set nodeName(_readonly: string) {}

  /** Attribute name. */
  get name() {
    return this[NAME];
  }

  set name(_readonly: string) {}

  /** Attribute value. Setting triggers hooks on the owner element. */
  get value() {
    return this[VALUE];
  }

  set value(value: string) {
    const str = String(value);
    this[VALUE] = str;
    const ownerElement = this[OWNER_ELEMENT];
    if (!ownerElement) return;
    (this[HOOKS] as Partial<Hooks>).setAttribute?.(
      ownerElement as never,
      this[NAME],
      str,
      this[NS],
    );
  }

  /** Alias for `value`. */
  get nodeValue() {
    return this.value;
  }

  set nodeValue(value: string) {
    this.value = value;
  }

  /** Element that owns this attribute, or `null` if not attached. */
  get ownerElement() {
    return this[OWNER_ELEMENT];
  }

  /** Namespace URI for this attribute, or `null` if no namespace. */
  get namespaceURI() {
    return this[NS];
  }

  /** Always `true`. Present for DOM spec compatibility. */
  get specified() {
    return true;
  }
}
