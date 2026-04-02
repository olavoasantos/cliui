import {CSS_STYLE_DECLARATION_STORE} from '../constants/cssStyleDeclarationStore';

import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';
import type {CSSStyleDeclarationState} from '../types/CSSStyleDeclarationState';

/** Returns the shared state store for a CSSStyleDeclaration. */
export function getCSSStyleDeclarationStore(
  declaration: CSSStyleDeclaration,
): CSSStyleDeclarationState {
  return CSS_STYLE_DECLARATION_STORE.get(declaration)!;
}
