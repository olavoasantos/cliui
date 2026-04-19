import {ATTRIBUTES, NS, NamespaceURI, OWNER_DOCUMENT} from '../constants';
import {CommentNodeGuard} from '../guards/CommentNodeGuard';
import {DocumentFragmentNodeGuard} from '../guards/DocumentFragmentNodeGuard';
import {ElementNodeGuard} from '../guards/ElementNodeGuard';
import {TextNodeGuard} from '../guards/TextNodeGuard';

import type {Document} from '../classes/Document';
import type {DocumentFragment} from '../classes/DocumentFragment';
import type {Node} from '../classes/Node';

/** Clones a node into the provided owner document. */
export function cloneNode(
  node: Node,
  deep?: boolean,
  document: Document = node.ownerDocument,
): Node {
  if (TextNodeGuard(node)) {
    return document.createTextNode(node.data);
  }

  if (CommentNodeGuard(node)) {
    return document.createComment(node.data);
  }

  if (ElementNodeGuard(node)) {
    const ns = node[NS];
    const cloned =
      ns && ns !== NamespaceURI.XHTML
        ? document.createElementNS(ns, node.localName)
        : document.createElement(node.localName);

    if (node[ATTRIBUTES]) {
      for (let index = 0; index < node[ATTRIBUTES].length; index++) {
        const attribute = node[ATTRIBUTES].item(index)!;
        cloned.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      }
    }

    if (deep) {
      for (const child of node.childNodes) {
        cloned.appendChild(cloneNode(child, true, document));
      }
    }

    return cloned;
  }

  if (DocumentFragmentNodeGuard(node)) {
    const fragment = document.createDocumentFragment();

    if (deep) {
      for (const child of (node as DocumentFragment).childNodes) {
        fragment.appendChild(cloneNode(child, true, document));
      }
    }

    return fragment;
  }

  const cloned = new (node.constructor as new () => Node)();
  cloned[OWNER_DOCUMENT] = document;
  return cloned;
}
