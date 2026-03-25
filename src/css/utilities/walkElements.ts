import {CHILD, NEXT, NodeType} from '../../dom/constants';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';

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
