import {getCSSStyleDeclarationStore} from './getCSSStyleDeclarationStore';

import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';

/** Notifies DOM hooks when a CSSStyleDeclaration changes. */
export function notifyCSSStyleDeclaration(declaration: CSSStyleDeclaration): void {
  const state = getCSSStyleDeclarationStore(declaration);

  if (state.element === null) {
    return;
  }

  const cssText = declaration.cssText;

  if (cssText) {
    state.element.setAttribute('style', cssText);
  } else {
    state.element.removeAttribute('style');
  }
}
