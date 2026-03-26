import {describe, expect, it} from 'vitest';

import {UIEvent} from '../UIEvent';
import {Window} from '../Window';

describe('UIEvent integration', () => {
  it('dispatches through DOM listeners while preserving view and detail metadata', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const seen: UIEvent[] = [];

    target.addEventListener('resize', (event) => {
      seen.push(event as UIEvent);
    });
    target.dispatchEvent(new UIEvent('resize', {detail: 2, view: window}));

    expect(seen).toHaveLength(1);
    const event = seen[0]!;
    expect(event.detail).toBe(2);
    expect(event.view).toBe(window);
  });
});
