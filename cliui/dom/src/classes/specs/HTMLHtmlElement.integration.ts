import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLHtmlElement integration', () => {
  it('contains the document head and body as the root html element', () => {
    const document = new Window().document;

    expect(document.documentElement.firstChild).toBe(document.head);
    expect(document.documentElement.lastChild).toBe(document.body);
  });
});
