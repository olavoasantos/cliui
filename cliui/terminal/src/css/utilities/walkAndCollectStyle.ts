import {CHILD, NEXT, NodeType} from '@cliui/dom';

import type {Node} from '@cliui/dom';
import type {Element} from '@cliui/dom';

/** Recursively collects `<style>` and `<link rel="stylesheet">` elements in a subtree. */
export function walkAndCollectStyle(element: Element, elements: Element[]): void {
  let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];

  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = child as unknown as Element;

      if (childElement.localName === 'style') {
        elements.push(childElement);
      } else if (
        childElement.localName === 'link' &&
        childElement.getAttribute('rel') === 'stylesheet'
      ) {
        elements.push(childElement);
      } else {
        walkAndCollectStyle(childElement, elements);
      }
    }

    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }
}
