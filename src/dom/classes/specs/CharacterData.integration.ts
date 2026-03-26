import {describe, expect, it, vi} from 'vitest';

import {HOOKS} from '../../constants';
import {Window} from '../Window';

describe('CharacterData integration', () => {
  it('updates parent text content and notifies hooks even for repeated assignments', () => {
    const window = new Window();
    const setText = vi.fn();
    window[HOOKS] = {setText};
    const text = window.document.createTextNode('hello');
    const host = window.document.createElement('div');
    host.appendChild(text);

    text.data = 'hello';
    text.data = 'world';

    expect(host.textContent).toBe('world');
    expect(setText).toHaveBeenNthCalledWith(1, text, 'hello', 'hello');
    expect(setText).toHaveBeenNthCalledWith(2, text, 'world', 'hello');
  });
});
