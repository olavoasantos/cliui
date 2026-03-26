import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('ParentNode integration', () => {
  it('coordinates fragment insertion, query helpers, and child collections on a live subtree', () => {
    const document = new Window().document;
    const parent = document.createElement('div');
    const fragment = document.createDocumentFragment();
    const child = document.createElement('span');
    child.className = 'target';
    fragment.appendChild(child);

    parent.appendChild(fragment);

    expect(parent.querySelector('.target')).toBe(child);
    expect(parent.children).toEqual([child]);
    expect(parent.childNodes[0]).toBe(child);
  });
});
