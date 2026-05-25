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

/**
 * Represents the document node — the entry point for creating and querying DOM elements.
 */
export class Document extends ParentNode {
  override nodeType = NodeType.DOCUMENT_NODE;
  [NAME] = '#document';

  /** The document's `<body>` element. */
  body: HTMLBodyElement;

  /** The document's `<head>` element. */
  head: HTMLHeadElement;

  /** The document's root `<html>` element. */
  documentElement: HTMLHtmlElement;

  /** The Window that owns this document. */
  defaultView: Window;

  /** The element that currently has focus. Defaults to `document.body`. */
  activeElement: HTMLBodyElement | Element;

  /** The element currently under the pointer, or `null`. */
  hoveredElement: Element | null = null;

  /** Returns the document's visibility state. Always `'visible'` for terminal. */
  visibilityState: 'visible' | 'hidden' = 'visible';

  /** Returns the document's loading state. Starts as `'loading'`. Set to `'complete'` by the host environment. */
  readyState: 'loading' | 'interactive' | 'complete' = 'loading';

  /**
   * Gets or sets the document's title.
   *
   * The getter returns the text content of the first `<title>` element in
   * `<head>`, or an empty string if none exists. The setter updates that
   * element's text content, creating a `<title>` element if one doesn't exist.
   */
  get title(): string {
    const titleElement = this.head.querySelector('title');
    return titleElement ? (titleElement.textContent ?? '') : '';
  }

  set title(value: string) {
    let titleElement = this.head.querySelector('title');

    if (!titleElement) {
      titleElement = this.createElement('title');
      this.head.appendChild(titleElement);
    }

    titleElement.textContent = value;
  }

  /**
   * Returns whether the document has focus.
   *
   * Reflects the terminal focus state — `true` when the terminal window
   * has focus, `false` when it does not.
   */
  hasFocus(): boolean {
    return this.visibilityState === 'visible';
  }

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
   * Sets the document's currently hovered element and notifies hooks so
   * `:hover`-dependent styles can be invalidated.
   *
   * @param element - The deepest hovered element, or `null` when nothing is hovered.
   */
  setHoveredElement(element: Element | null): void {
    if (element === this.hoveredElement) {
      return;
    }

    const previousHoveredElement = this.hoveredElement;
    this.hoveredElement = element;

    (this.defaultView[HOOKS] as Partial<Hooks>).hoverChange?.(previousHoveredElement, element);
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

  /**
   * Creates a new Element with the given tag name.
   *
   * @param localName - The tag name for the new element.
   * @returns The newly created Element.
   *
   * @example
   * ```ts
   * const div = document.createElement('div');
   * ```
   *
   * @see {@link Hooks.createElement} for the hook notification fired after creation.
   */
  createElement(localName: string) {
    return createElement(this, localName);
  }

  /**
   * Creates a new Element in the given namespace.
   *
   * @param namespaceURI - The namespace URI for the new element.
   * @param localName - The tag name for the new element.
   * @returns The newly created Element.
   */
  createElementNS(namespaceURI: NamespaceURI, localName: string) {
    return createElement(this, localName, namespaceURI);
  }

  /**
   * Creates a new Text node.
   *
   * @param data - The text content for the node.
   * @returns The newly created Text node.
   *
   * @example
   * ```ts
   * const text = document.createTextNode('hello');
   * ```
   */
  createTextNode(data: unknown) {
    const text = createNode(new Text(data), this);
    (this[HOOKS] as Partial<Hooks>).createText?.(text as never, String(data));
    return text;
  }

  /**
   * Creates a new Comment node.
   *
   * @param data - The comment text.
   * @returns The newly created Comment node.
   */
  createComment(data: unknown) {
    return createNode(new Comment(data), this);
  }

  /**
   * Creates a new empty DocumentFragment.
   *
   * @returns The newly created DocumentFragment.
   */
  createDocumentFragment() {
    return createNode(new DocumentFragment(), this);
  }

  /**
   * Creates an uninitialized Event.
   *
   * @deprecated Use the `Event` constructor instead.
   * @returns An empty Event instance.
   */
  createEvent() {
    return new Event('');
  }

  /**
   * Clones a node into this document.
   *
   * @param node - The node to clone.
   * @param deep - Whether to recursively clone child nodes.
   * @returns The cloned node, owned by this document.
   */
  importNode(node: Node, deep?: boolean) {
    return cloneNode(node, deep, this);
  }

  /**
   * Returns the element with the given `id` attribute, or `null`.
   *
   * @param id - The ID to search for.
   * @returns The matching Element, or `null` if none exists.
   */
  getElementById(id: string) {
    return this.querySelector(`[id="${id}"]`);
  }

  /**
   * Transfers a node from another document into this one.
   *
   * Removes the node from its previous parent and recursively updates
   * `ownerDocument` for the node and its descendants.
   *
   * @param node - The node to adopt.
   * @returns The adopted node.
   */
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
