import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('Text integration', () => {
  it('updates serialized and aggregated text content inside a live subtree', () => {
    const document = new Window().document;
    const host = document.createElement('div');
    const text = document.createTextNode('hello');
    host.appendChild(text);

    text.data = 'world';

    expect(host.textContent).toBe('world');
    expect(host.innerHTML).toBe('world');
  });
});
