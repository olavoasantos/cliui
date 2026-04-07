import {CHILD, NEXT, NodeType} from '@cliui/dom';
import {walkAndCollectStyle} from './walkAndCollectStyle';

import type {Node} from '@cliui/dom';
import type {Element} from '@cliui/dom';
import type {Document} from '@cliui/dom';

/** Collects all `<style>` and `<link rel="stylesheet">` elements from a document. */
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
      } else if (element.localName === 'link' && element.getAttribute('rel') === 'stylesheet') {
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
