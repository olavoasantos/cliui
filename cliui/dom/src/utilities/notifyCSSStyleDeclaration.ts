import {HOOKS} from '../constants';
import {getCSSStyleDeclarationStore} from './getCSSStyleDeclarationStore';

import type {Hooks} from '../types';
import type {CSSStyleDeclaration} from '../classes/CSSStyleDeclaration';

/** Notifies DOM hooks when a CSSStyleDeclaration changes. */
export function notifyCSSStyleDeclaration(declaration: CSSStyleDeclaration): void {
  const state = getCSSStyleDeclarationStore(declaration);

  if (state.element === null) {
    return;
  }

  const hooks = (state.element as unknown as {[HOOKS]: Partial<Hooks>})[HOOKS];
  hooks?.setAttribute?.(state.element, 'style', declaration.cssText);
}
