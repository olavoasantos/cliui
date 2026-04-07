import {HOOKS, NAME, NS} from '../constants';
import {createNode} from './createNode';

import type {Hooks, NamespaceURI} from '../types';
import type {Document} from '../classes/Document';
import type {Element} from '../classes/Element';

/** Initializes an element instance with document ownership and DOM metadata. */
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
