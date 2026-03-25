import type {Element} from '../classes/Element';

/** Element shape supporting custom-element attribute change callbacks. */
export interface CustomElementWithAttributeChangedCallback extends Element {
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
}
