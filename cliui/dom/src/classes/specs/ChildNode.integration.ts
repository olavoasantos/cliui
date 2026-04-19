import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('ChildNode integration', () => {
  it('reorders siblings through before, after, replaceWith, and remove within a live parent subtree', () => {
    const document = new Window().document;
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const second = document.createElement('span');
    const replacement = document.createElement('strong');

    parent.append(first, second);
    second.before('middle');
    first.after(document.createElement('em'));
    second.replaceWith(replacement);
    replacement.remove();

    expect(parent.childNodes).toHaveLength(3);
    expect(parent.childNodes[0]).toBe(first);
    expect(parent.childNodes[1]?.nodeType).toBe(1);
    expect(parent.lastChild?.nodeType).toBe(3);
  });
});
