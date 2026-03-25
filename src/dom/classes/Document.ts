import {HOOKS, IS_CONNECTED, NAME, NodeType, OWNER_DOCUMENT} from '../constants';
import {ParentNodeGuard} from '../guards/ParentNodeGuard';
import {adoptNode} from '../utilities/adoptNode';
import {cloneNode} from '../utilities/cloneNode';
import {createElement} from '../utilities/createElement';
import {createNode} from '../utilities/createNode';
import {setupElement} from '../utilities/setupElement';
import {Comment} from './Comment';
import {DocumentFragment} from './DocumentFragment';
import {Event} from './Event';
import {HTMLBodyElement} from './HTMLBodyElement';
import {HTMLHeadElement} from './HTMLHeadElement';
import {HTMLHtmlElement} from './HTMLHtmlElement';
import {ParentNode} from './ParentNode';
import {Text} from './Text';

import type {Node} from './Node';
import type {Window} from './Window';
import type {Hooks, NamespaceURI} from '../types';

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

    if (ParentNodeGuard(node)) {
      for (const child of node.childNodes) {
        adoptNode(child, this);
      }
    }

    return node;
  }
}
