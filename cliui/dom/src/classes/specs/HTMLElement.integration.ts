import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLElement integration', () => {
  it('creates registered custom HTML elements through the document and upgrades them via the window registry', () => {
    const window = new Window();
    class XPanel extends window.HTMLElement {}

    window.customElements.define('x-panel', XPanel as unknown as CustomElementConstructor);
    const element = window.document.createElement('x-panel');

    expect(element).toBeInstanceOf(XPanel);
    expect(element.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  });
});
