import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';
import type {CSSStyleDeclarationState} from '../types/CSSStyleDeclarationState';

const cssStyleDeclarationStore = new WeakMap<CSSStyleDeclaration, CSSStyleDeclarationState>();

/** Returns the shared state store for a CSSStyleDeclaration. */
export function getCSSStyleDeclarationStore(
  declaration: CSSStyleDeclaration,
): CSSStyleDeclarationState {
  return cssStyleDeclarationStore.get(declaration)!;
}

/** Sets the shared state store for a CSSStyleDeclaration. */
export function setCSSStyleDeclarationStore(
  declaration: CSSStyleDeclaration,
  state: CSSStyleDeclarationState,
): void {
  cssStyleDeclarationStore.set(declaration, state);
}
