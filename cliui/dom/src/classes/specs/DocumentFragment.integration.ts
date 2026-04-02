import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('DocumentFragment integration', () => {
  it('moves fragment children into a live parent while preserving query access before insertion', () => {
    const document = new Window().document;
    const fragment = document.createDocumentFragment();
    const title = document.createElement('span');
    title.className = 'title';
    fragment.appendChild(title);

    expect(fragment.querySelector('.title')).toBe(title);

    document.body.appendChild(fragment);

    expect(document.body.querySelector('.title')).toBe(title);
    expect(fragment.childNodes).toHaveLength(0);
  });
});
