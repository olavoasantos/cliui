import {CSS_STYLE_DECLARATION_STORE} from '../constants/cssStyleDeclarationStore';

import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';
import type {CSSStyleDeclarationState} from '../types/CSSStyleDeclarationState';

/** Sets the shared state store for a CSSStyleDeclaration. */
export function setCSSStyleDeclarationStore(
  declaration: CSSStyleDeclaration,
  state: CSSStyleDeclarationState,
): void {
  CSS_STYLE_DECLARATION_STORE.set(declaration, state);
}
