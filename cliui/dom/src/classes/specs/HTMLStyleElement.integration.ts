import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLStyleElement integration', () => {
  it('exposes stylesheet text from live text node content in the document head', () => {
    const document = new Window().document;
    const style = document.createElement('style');

    document.head.appendChild(style);
    expect(style.sheet).toBe('');

    style.textContent = '.card { color: red; }';

    expect(document.head.querySelector('style')).toBe(style);
    expect(style.sheet).toBe('.card { color: red; }');
  });
});
