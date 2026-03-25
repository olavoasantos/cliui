import {describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../../constants';
import {CSSStyleDeclaration} from '../../classes/CSSStyleDeclaration';
import {Window} from '../../classes/Window';
import {setCSSStyleDeclarationStore} from '../getCSSStyleDeclarationStore';
import {notifyCSSStyleDeclaration} from '../notifyCSSStyleDeclaration';

describe('notifyCSSStyleDeclaration', () => {
  it('forwards style changes to DOM hooks', () => {
    const window = new Window();
    const setAttribute = vi.fn();
    window[HOOKS] = {setAttribute};
    const element = window.document.createElement('div');
    const declaration = Object.create(CSSStyleDeclaration.prototype) as CSSStyleDeclaration;

    setCSSStyleDeclarationStore(declaration, {
      properties: new Map([['color', 'red']]),
      element,
    });

    notifyCSSStyleDeclaration(declaration);

    expect(setAttribute).toHaveBeenCalledWith(element, 'style', 'color: red');
  });
});
