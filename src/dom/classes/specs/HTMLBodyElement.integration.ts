import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLBodyElement integration', () => {
  it('acts as the default active element and query root for body content', () => {
    const document = new Window().document;
    const child = document.createElement('section');
    child.setAttribute('id', 'content');
    document.body.appendChild(child);

    expect(document.activeElement).toBe(document.body);
    expect(document.body.querySelector('#content')).toBe(child);
  });
});
