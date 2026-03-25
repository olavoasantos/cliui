import {NS, NEXT, VALUE, OWNER_ELEMENT, NAME, NodeType, HOOKS} from '../constants';
import type {NamespaceURI} from '../types';
import type {Hooks} from '../types';
import type {Element} from './Element';
import {Node} from './Node';

export class Attr extends Node {
  override nodeType = NodeType.ATTRIBUTE_NODE;
  [NS]: NamespaceURI | null = null;
  [NEXT]: Attr | null = null;
  [VALUE]: string;
  [OWNER_ELEMENT]: Element | null = null;

  constructor(name: string, value: string, namespace?: NamespaceURI | null) {
    super();
    this[NAME] = name;
    this[VALUE] = value;
    if (namespace) this[NS] = namespace;
  }

  get nodeName() {
    return this[NAME];
  }

  set nodeName(_readonly: string) {}

  get name() {
    return this[NAME];
  }

  set name(_readonly: string) {}

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

  get nodeValue() {
    return this.value;
  }

  set nodeValue(value: string) {
    this.value = value;
  }

  get ownerElement() {
    return this[OWNER_ELEMENT];
  }

  get namespaceURI() {
    return this[NS];
  }

  get specified() {
    return true;
  }
}
