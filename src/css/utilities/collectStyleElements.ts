import {CHILD, NEXT, NodeType} from '../../dom/constants';
import {walkAndCollectStyle} from './walkAndCollectStyle';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';
import type {Document} from '../../dom/classes/Document';

/** Collects all `<style>` elements from a document. */
export function collectStyleElements(document: Document): Element[] {
  const elements: Element[] = [];
  const head = document.head;

  if (head === null) {
    return elements;
  }

  let child = (head as unknown as {[CHILD]: Node | undefined})[CHILD];

  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const element = child as unknown as Element;

      if (element.localName === 'style') {
        elements.push(element);
      }
    }

    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }

  const body = document.body;

  if (body) {
    walkAndCollectStyle(body, elements);
  }

  return elements;
}
