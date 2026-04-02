import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('CustomElementRegistry integration', () => {
  it('upgrades existing elements in the owner document when a definition is registered', () => {
    const window = new Window();
    class XBadge extends window.HTMLElement {}
    const element = window.document.createElement('x-badge');
    window.document.body.appendChild(element);

    window.customElements.define('x-badge', XBadge as unknown as CustomElementConstructor);

    expect(element).toBeInstanceOf(XBadge);
    expect(window.customElements.get('x-badge')).toBe(XBadge);
  });
});
