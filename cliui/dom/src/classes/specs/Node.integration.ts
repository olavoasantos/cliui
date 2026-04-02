import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('Node integration', () => {
  it('coordinates contains, cloneNode, and textContent across a nested live subtree', () => {
    const document = new Window().document;
    const root = document.createElement('div');
    const child = document.createElement('section');
    const text = document.createTextNode('hello');
    child.appendChild(text);
    root.appendChild(child);
    document.body.appendChild(root);

    const clone = root.cloneNode(true);

    expect(root.contains(text)).toBe(true);
    expect(root.textContent).toBe('hello');
    expect(clone.textContent).toBe('hello');
  });
});
