import {NamespaceURI} from '../constants';
import {setupElement} from './setupElement';
import {Element} from '../classes/Element';
import {HTMLStyleElement} from '../classes/HTMLStyleElement';
import {HTMLTemplateElement} from '../classes/HTMLTemplateElement';
import {SVGElement} from '../classes/SVGElement';

import type {NamespaceURI as NamespaceURIType} from '../types';
import type {Document} from '../classes/Document';

/** Creates and initializes an element for the provided document. */
export function createElement(ownerDocument: Document, name: string, namespace?: NamespaceURIType) {
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
