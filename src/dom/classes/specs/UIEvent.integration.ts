import {describe, expect, it} from 'vitest';

import {UIEvent} from '../UIEvent';
import {Window} from '../Window';

describe('UIEvent integration', () => {
  it('dispatches through DOM listeners while preserving view and detail metadata', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    let seen: UIEvent | null = null;

    target.addEventListener('resize', (event) => {
      seen = event as UIEvent;
    });
    target.dispatchEvent(new UIEvent('resize', {detail: 2, view: window}));

    expect(seen?.detail).toBe(2);
    expect(seen?.view).toBe(window);
  });
});
