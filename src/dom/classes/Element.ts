import {
  ATTRIBUTES,
  CLASS_LIST,
  NS,
  NamespaceURI as NamespaceValue,
  NodeType,
  STYLE,
} from '../constants';
import {parseHtml} from '../utilities/parseHtml';
import {serializeChildren} from '../utilities/serializeChildren';
import {serializeNode} from '../utilities/serializeNode';
import {Attr} from './Attr';
import {CSSStyleDeclaration} from './CSSStyleDeclaration';

import type {NamespaceURI} from '../types';
import {DOMTokenList} from './DOMTokenList';
import {NamedNodeMap} from './NamedNodeMap';
import {ParentNode} from './ParentNode';

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  override nodeType = NodeType.ELEMENT_NODE;

  [NS]: NamespaceURI = NamespaceValue.XHTML;
  get namespaceURI() {
    return this[NS];
  }

  get tagName() {
    return this.nodeName;
  }

  [ATTRIBUTES]!: NamedNodeMap;
  [STYLE]!: CSSStyleDeclaration;
  [CLASS_LIST]!: DOMTokenList;

  [anyProperty: string]: unknown;

  get style(): CSSStyleDeclaration {
    let style = this[STYLE];
    if (!style) {
      style = new CSSStyleDeclaration(this);
      this[STYLE] = style;
    }
    return style;
  }

  /** Gets or sets the class attribute as a space-separated string. */
  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', value);
  }

  /** Returns a DOMTokenList for the class attribute. */
  get classList(): DOMTokenList {
    let list = this[CLASS_LIST];
    if (!list) {
      list = new DOMTokenList(this, 'class');
      this[CLASS_LIST] = list;
    }
    return list;
  }

  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;

  get attributes() {
    let attributes = this[ATTRIBUTES];
    if (!attributes) {
      attributes = new NamedNodeMap(this);
      this[ATTRIBUTES] = attributes;
    }
    return attributes;
  }

  getAttributeNames() {
    return [...this.attributes].map((attribute) => attribute.name);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null;
  }

  get nextElementSibling() {
    let sibling = this.nextSibling;
    while (sibling && sibling.nodeType !== 1) sibling = sibling.nextSibling;
    return sibling;
  }

  get previousElementSibling() {
    let sibling = this.previousSibling;
    while (sibling && sibling.nodeType !== 1) sibling = sibling.previousSibling;
    return sibling;
  }

  setAttribute(name: string, value: string) {
    this.attributes.setNamedItem(new Attr(name, String(value)));
  }

  setAttributeNS(namespace: NamespaceURI | null, name: string, value: string) {
    this.attributes.setNamedItemNS(new Attr(name, String(value), namespace));
  }

  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  getAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  hasAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  removeAttributeNS(namespace: NamespaceURI | null, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  get outerHTML() {
    return serializeNode(this);
  }

  get innerHTML() {
    return serializeChildren(this);
  }

  set innerHTML(html: unknown) {
    if (html == null || html === '') {
      this.replaceChildren();
    } else {
      const fragment = parseHtml(String(html), this);
      this.replaceChildren(fragment);
    }
  }
}
