import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('CSSStyleDeclaration integration', () => {
  it('keeps style property access, shorthand expansion, and outerHTML serialization aligned on an element', () => {
    const document = new Window().document;
    const element = document.createElement('div');

    element.style.padding = '1 2';
    element.style.backgroundColor = 'red';
    element.style.cssText += '; font-weight: bold';

    expect(element.style.getPropertyValue('padding-left')).toBe('2');
    expect(element.style.backgroundColor).toBe('red');
    expect(element.style.getPropertyValue('font-weight')).toBe('bold');
    expect(element.getAttribute('style')).toContain('background-color: red');
    expect(element.outerHTML).toContain('style=');
  });
});
