import {CHILD, NEXT, NodeType} from '@cliui/dom';

import type {Node} from '@cliui/dom';
import type {Element} from '@cliui/dom';

/** Walks all element descendants of a given element. */
export function walkElements(element: Element, callback: (element: Element) => void): void {
  let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];

  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const childElement = child as unknown as Element;
      callback(childElement);
      walkElements(childElement, callback);
    }

    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }
}
