import {describe, expect, it, vi} from 'vitest';

import {Window} from '../../classes/Window';
import {Event} from '../../classes/Event';
import {removeEventTargetListener} from '../removeEventTargetListener';

describe('removeEventTargetListener', () => {
  it('removes a listener from an event target', () => {
    const window = new Window();
    const element = window.document.createElement('div');
    const listener = vi.fn();

    element.addEventListener('click', listener);
    removeEventTargetListener(element, 'click', listener);
    element.dispatchEvent(new Event('click'));

    expect(listener).not.toHaveBeenCalled();
  });
});
