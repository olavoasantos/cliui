import {
  NS,
  NAME,
  NamespaceURI,
  NodeType,
  OWNER_DOCUMENT,
  HOOKS,
  IS_CONNECTED,
} from '../constants/index';
import type {Window} from './Window';
import type {Node} from './Node';
import type {Hooks} from '../types/index';
import {Event} from './Event';
import {ParentNode} from './ParentNode';
import {Element} from './Element';
import {SVGElement} from './SVGElement';
import {Text} from './Text';
import {Comment} from './Comment';
import {DocumentFragment} from './DocumentFragment';
import {HTMLTemplateElement} from './HTMLTemplateElement';
import {HTMLStyleElement} from './HTMLStyleElement';
import {isParentNode, cloneNode} from '../utilities/shared';
import {HTMLBodyElement} from './HTMLBodyElement';
import {HTMLHeadElement} from './HTMLHeadElement';
import {HTMLHtmlElement} from './HTMLHtmlElement';

export class Document extends ParentNode {
  override nodeType = NodeType.DOCUMENT_NODE;
  [NAME] = '#document';
  body: HTMLBodyElement;
  head: HTMLHeadElement;
  documentElement: HTMLHtmlElement;
  defaultView: Window;
  [IS_CONNECTED] = true;

  constructor(defaultView: Window) {
    super();
    this.defaultView = defaultView;
    this[OWNER_DOCUMENT] = this;
    this.documentElement = setupElement(new HTMLHtmlElement(), this, 'html');
    this.body = setupElement(new HTMLBodyElement(), this, 'body');
    this.head = setupElement(new HTMLHeadElement(), this, 'head');

    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  createElement(localName: string) {
    return createElement(this, localName);
  }

  createElementNS(namespaceURI: NamespaceURI, localName: string) {
    return createElement(this, localName, namespaceURI);
  }

  createTextNode(data: unknown) {
    const text = createNode(new Text(data), this);
    (this[HOOKS] as Partial<Hooks>).createText?.(text as never, String(data));
    return text;
  }

  createComment(data: unknown) {
    return createNode(new Comment(data), this);
  }

  createDocumentFragment() {
    return createNode(new DocumentFragment(), this);
  }

  createEvent() {
    return new Event('');
  }

  importNode(node: Node, deep?: boolean) {
    return cloneNode(node, deep, this);
  }

  adoptNode(node: Node) {
    if (node[OWNER_DOCUMENT] === this) return node;

    node.parentNode?.removeChild(node);
    adoptNode(node, this);

    return node;
  }
}

export function createNode<T extends Node>(node: T, ownerDocument: Document) {
  Object.defineProperty(node, OWNER_DOCUMENT, {
    value: ownerDocument,
    writable: true,
    enumerable: false,
  });

  return node;
}

export function createElement(ownerDocument: Document, name: string, namespace?: NamespaceURI) {
  let element: Element;
  const lowerName = String(name).toLowerCase();

  if (namespace === NamespaceURI.SVG) {
    element = new SVGElement();
  } else if (lowerName === 'template') {
    element = new HTMLTemplateElement();
  } else if (lowerName === 'style') {
    element = new HTMLStyleElement();
  } else {
    const CustomElement = ownerDocument.defaultView.customElements.get(name);
    element = CustomElement ? (new CustomElement() as unknown as Element) : new Element();
  }

  return setupElement(element, ownerDocument, name, namespace);
}

export function setupElement<T extends Element>(
  element: T,
  ownerDocument: Document,
  name: string,
  namespace?: NamespaceURI,
) {
  createNode(element, ownerDocument);

  Object.defineProperty(element, NAME, {value: name});

  if (namespace) {
    Object.defineProperty(element, NS, {value: namespace});
  }

  (ownerDocument[HOOKS] as Partial<Hooks>).createElement?.(element as never, namespace);

  return element;
}

export function adoptNode(node: Node, document: Document) {
  node[OWNER_DOCUMENT] = document;

  if (isParentNode(node)) {
    for (const child of node.childNodes) {
      adoptNode(child, document);
    }
  }
}
