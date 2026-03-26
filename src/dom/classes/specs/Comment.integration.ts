import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('Comment integration', () => {
  it('participates in serialization and sibling navigation without affecting text content', () => {
    const document = new Window().document;
    const host = document.createElement('div');
    const before = document.createElement('span');
    const comment = document.createComment('note');
    const after = document.createElement('span');

    before.textContent = 'A';
    after.textContent = 'B';
    host.append(before, comment, after);

    expect(host.outerHTML).toContain('<!--note-->');
    expect(host.textContent).toBe('AB');
    expect(after.previousSibling).toBe(comment);
  });
});
