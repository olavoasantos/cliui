import type {Element} from '../classes/Element';

/** Internal state store for CSSStyleDeclaration instances. */
export interface CSSStyleDeclarationState {
  properties: Map<string, string>;
  element: Element | null;
}
