import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';
import type {CSSStyleDeclarationState} from '../types';

/** Internal backing store for CSSStyleDeclaration instances. */
export const CSS_STYLE_DECLARATION_STORE = new WeakMap<
  CSSStyleDeclaration,
  CSSStyleDeclarationState
>();
