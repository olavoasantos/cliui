import {NS, ATTRIBUTES, STYLE, NamespaceURI, NodeType} from '../constants/index';
import {ParentNode} from './ParentNode';
import {NamedNodeMap} from './NamedNodeMap';
import {Attr} from './Attr';
import {CSSStyleDeclaration} from './CSSStyleDeclaration';
import {serializeNode, serializeChildren, parseHtml} from '../utilities/serialization';

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  override nodeType = NodeType.ELEMENT_NODE;

  [NS]: NamespaceURI = NamespaceURI.XHTML;
  get namespaceURI() {
    return this[NS];
  }

  get tagName() {
    return this.nodeName;
  }

  [ATTRIBUTES]!: NamedNodeMap;
  [STYLE]!: CSSStyleDeclaration;

  [anyProperty: string]: unknown;

  get style(): CSSStyleDeclaration {
    let style = this[STYLE];
    if (!style) {
      style = new CSSStyleDeclaration(this);
      this[STYLE] = style;
    }
    return style;
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
    return [...this.attributes].map((attr) => attr.name);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null;
  }

  get nextElementSibling() {
    let sib = this.nextSibling;
    while (sib && sib.nodeType !== 1) sib = sib.nextSibling;
    return sib;
  }

  get previousElementSibling() {
    let sib = this.previousSibling;
    while (sib && sib.nodeType !== 1) sib = sib.previousSibling;
    return sib;
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
