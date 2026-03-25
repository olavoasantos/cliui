import {CHILD, NEXT, NodeType} from '../../dom/constants';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';

/** Recursively collects `<style>` elements in a subtree. */
export function walkAndCollectStyle(element: Element, elements: Element[]): void {
  let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];

  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = child as unknown as Element;

      if (childElement.localName === 'style') {
        elements.push(childElement);
      } else {
        walkAndCollectStyle(childElement, elements);
      }
    }

    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }
}
