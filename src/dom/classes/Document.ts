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
import {FocusEvent} from './FocusEvent';
import {HTMLBodyElement} from './HTMLBodyElement';
import {HTMLHeadElement} from './HTMLHeadElement';
import {HTMLHtmlElement} from './HTMLHtmlElement';
import {ParentNode} from './ParentNode';
import {Text} from './Text';

import type {Element} from './Element';
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
  activeElement: HTMLBodyElement | Element;
  [IS_CONNECTED] = true;

  constructor(defaultView: Window) {
    super();
    this.defaultView = defaultView;
    this[OWNER_DOCUMENT] = this;
    this.documentElement = setupElement(new HTMLHtmlElement(), this, 'html');
    this.body = setupElement(new HTMLBodyElement(), this, 'body');
    this.head = setupElement(new HTMLHeadElement(), this, 'head');
    this.activeElement = this.body;

    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  /**
   * Sets the document's active element and dispatches the corresponding focus
   * transition events.
   *
   * @param element - The element to focus. Defaults to `document.body`.
   */
  setActiveElement(element: Element | null): void {
    const nextActiveElement = element ?? this.body;

    if (nextActiveElement === this.activeElement) {
      return;
    }

    const previousActiveElement = this.activeElement;

    previousActiveElement.dispatchEvent(
      new FocusEvent('blur', {
        relatedTarget: nextActiveElement,
      }),
    );
    previousActiveElement.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: nextActiveElement,
      }),
    );

    this.activeElement = nextActiveElement;

    (this.defaultView[HOOKS] as Partial<Hooks>).focusChange?.(
      previousActiveElement,
      nextActiveElement,
    );

    nextActiveElement.dispatchEvent(
      new FocusEvent('focus', {
        relatedTarget: previousActiveElement,
      }),
    );
    nextActiveElement.dispatchEvent(
      new FocusEvent('focusin', {
        bubbles: true,
        relatedTarget: previousActiveElement,
      }),
    );
  }

  /**
   * Cycles focus forward or backward across elements with a `tabindex`
   * attribute, in document order.
   *
   * @param backwards - Whether to move backward instead of forward.
   * @returns The newly focused element.
   */
  focusNext(backwards = false): Element {
    const focusableElements = this.querySelectorAll('[tabindex]');

    if (focusableElements.length === 0) {
      this.setActiveElement(this.body);
      return this.body;
    }

    const currentIndex = focusableElements.indexOf(this.activeElement as Element);
    const nextIndex =
      currentIndex === -1
        ? backwards
          ? focusableElements.length - 1
          : 0
        : (currentIndex + (backwards ? -1 : 1) + focusableElements.length) %
          focusableElements.length;
    const nextElement = focusableElements[nextIndex] ?? this.body;

    this.setActiveElement(nextElement);

    return nextElement;
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
