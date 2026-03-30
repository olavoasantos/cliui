import {describe, expect, it} from 'vitest';

import {CSSStyleDeclaration} from '../../classes/CSSStyleDeclaration';
import {getCSSStyleDeclarationStore} from '../getCSSStyleDeclarationStore';
import {setCSSStyleDeclarationStore} from '../setCSSStyleDeclarationStore';

describe('getCSSStyleDeclarationStore', () => {
  it('returns state that was previously stored', () => {
    const declaration = new CSSStyleDeclaration();
    const state = {properties: new Map([['color', 'red']]), element: null};

    setCSSStyleDeclarationStore(declaration, state);

    expect(getCSSStyleDeclarationStore(declaration)).toBe(state);
  });
});
