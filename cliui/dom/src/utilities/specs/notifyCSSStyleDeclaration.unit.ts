import {describe, expect, it} from 'vitest';

import {CSSStyleDeclaration} from '../../classes/CSSStyleDeclaration';
import {Window} from '../../classes/Window';
import {setCSSStyleDeclarationStore} from '../setCSSStyleDeclarationStore';
import {notifyCSSStyleDeclaration} from '../notifyCSSStyleDeclaration';

describe('notifyCSSStyleDeclaration', () => {
  it('forwards style changes to the element style attribute', () => {
    const window = new Window();
    const element = window.document.createElement('div');
    const declaration = Object.create(CSSStyleDeclaration.prototype) as CSSStyleDeclaration;

    setCSSStyleDeclarationStore(declaration, {
      properties: new Map([['color', 'red']]),
      element,
    });

    notifyCSSStyleDeclaration(declaration);

    expect(element.getAttribute('style')).toBe('color: red');
  });
});
