import type {CustomElementWithAttributeChangedCallback} from '../types/CustomElementWithAttributeChangedCallback';
import type {Element} from '../classes/Element';

type ElementConstructor = {observedAttributes?: readonly string[]};

/** Notifies a custom element when one of its observed attributes changes. */
export function updateElementAttribute(
  element: Element,
  name: string,
  oldValue: string | null,
  newValue: string | null,
): void {
  const {observedAttributes} = element.constructor as ElementConstructor;
  const customElement = element as CustomElementWithAttributeChangedCallback;

  if (
    customElement.attributeChangedCallback == null ||
    observedAttributes == null ||
    !observedAttributes.includes(name)
  ) {
    return;
  }

  customElement.attributeChangedCallback.call(element, name, oldValue, newValue);
}
