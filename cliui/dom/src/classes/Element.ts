import {
  ATTRIBUTES,
  CLASS_LIST,
  NS,
  NamespaceURI as NamespaceValue,
  NodeType,
  STYLE,
} from '../constants';
import {matches as matchesSelector} from '../utilities/matches';
import {parseHtml} from '../utilities/parseHtml';
import {serializeChildren} from '../utilities/serializeChildren';
import {serializeNode} from '../utilities/serializeNode';
import {Attr} from './Attr';
import {CSSStyleDeclaration} from './CSSStyleDeclaration';

import type {NamespaceURI} from '../types';
import {DOMTokenList} from './DOMTokenList';
import {NamedNodeMap} from './NamedNodeMap';
import {ParentNode} from './ParentNode';

/**
 * Represents an element node in the DOM tree.
 *
 * Provides attribute management, CSS class manipulation, selector matching,
 * and HTML serialization.
 */
export class Element extends ParentNode {
  /** List of attribute names observed by `attributeChangedCallback` in custom element subclasses. */
  static readonly observedAttributes?: string[];

  override nodeType = NodeType.ELEMENT_NODE;

  [NS]: NamespaceURI = NamespaceValue.XHTML;
  /** Namespace URI for this element. XHTML by default. */
  get namespaceURI() {
    return this[NS];
  }

  /** Uppercase tag name of this element (e.g. `"DIV"`). */
  get tagName() {
    return this.nodeName;
  }

  [ATTRIBUTES]!: NamedNodeMap;
  [STYLE]!: CSSStyleDeclaration;
  [CLASS_LIST]!: DOMTokenList;

  [anyProperty: string]: unknown;

  /** Inline style declaration for this element. Lazily created on first access. */
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

  /**
   * Lifecycle callback invoked when an observed attribute changes.
   * Override in custom element subclasses.
   *
   * @param name - Attribute name that changed.
   * @param oldValue - Previous value, or `null` if the attribute was just added.
   * @param newValue - New value, or `null` if the attribute was removed.
   */
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;

  /** Ordered map of this element's attributes. Lazily created on first access. */
  get attributes() {
    let attributes = this[ATTRIBUTES];
    if (!attributes) {
      attributes = new NamedNodeMap(this);
      this[ATTRIBUTES] = attributes;
    }
    return attributes;
  }

  /**
   * Returns an array of all attribute names on this element.
   *
   * @returns Attribute names in document order.
   */
  getAttributeNames() {
    return [...this.attributes].map((attribute) => attribute.name);
  }

  /** First child that is an element, or `null` if none exists. */
  get firstElementChild() {
    return this.children[0] ?? null;
  }

  /** Last child that is an element, or `null` if none exists. */
  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null;
  }

  /** Next sibling that is an element, or `null` if none exists. */
  get nextElementSibling() {
    let sibling = this.nextSibling;
    while (sibling && sibling.nodeType !== 1) sibling = sibling.nextSibling;
    return sibling;
  }

  /** Previous sibling that is an element, or `null` if none exists. */
  get previousElementSibling() {
    let sibling = this.previousSibling;
    while (sibling && sibling.nodeType !== 1) sibling = sibling.previousSibling;
    return sibling;
  }

  /**
   * Sets an attribute on this element.
   *
   * @param name - Attribute name.
   * @param value - Attribute value.
   *
   * @example
   * ```ts
   * element.setAttribute('class', 'active');
   * ```
   *
   * @see {@link Hooks.setAttribute} for the hook notification fired on change.
   */
  setAttribute(name: string, value: string) {
    this.attributes.setNamedItem(new Attr(name, String(value)));
  }

  /**
   * Sets a namespaced attribute on this element.
   *
   * @param namespace - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttributeNS(namespace: NamespaceURI | null, name: string, value: string) {
    this.attributes.setNamedItemNS(new Attr(name, String(value), namespace));
  }

  /**
   * Returns the value of an attribute by name.
   *
   * @param name - Attribute name.
   * @returns The attribute value, or `null` if the attribute does not exist.
   */
  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  /**
   * Returns the value of a namespaced attribute.
   *
   * @param namespace - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   * @returns The attribute value, or `null` if the attribute does not exist.
   */
  getAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  /**
   * Checks whether an attribute exists on this element.
   *
   * @param name - Attribute name.
   */
  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  /**
   * Checks whether a namespaced attribute exists on this element.
   *
   * @param namespace - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   */
  hasAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  /**
   * Removes an attribute by name. No-op if the attribute does not exist.
   *
   * @param name - Attribute name.
   */
  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  /**
   * Removes a namespaced attribute. No-op if the attribute does not exist.
   *
   * @param namespace - Namespace URI, or `null` for no namespace.
   * @param name - Attribute name.
   */
  removeAttributeNS(namespace: NamespaceURI | null, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  /**
   * Tests whether this element matches a CSS selector.
   *
   * @param selector - CSS selector string.
   */
  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }

  /**
   * Traverses this element and its ancestors, returning the first that matches the selector.
   *
   * @param selector - CSS selector string.
   * @returns The matching ancestor element, or `null` if none matches.
   */
  closest(selector: string): Element | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- walking up the tree requires reassignment
    let current: Element | null = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement as Element | null;
    }
    return null;
  }

  /** Serialized HTML markup of this element and its contents. */
  get outerHTML() {
    return serializeNode(this);
  }

  /** Serialized HTML markup of this element's children. */
  get innerHTML() {
    return serializeChildren(this);
  }

  /**
   * Replaces all children by parsing the given HTML string.
   * An empty or `null` value removes all children.
   */
  set innerHTML(html: unknown) {
    if (html == null || html === '') {
      this.replaceChildren();
    } else {
      const fragment = parseHtml(String(html), this);
      this.replaceChildren(fragment);
    }
  }
}
