import {describe, expect, it} from 'vitest';

import {ClipboardEvent} from '../ClipboardEvent';
import {Window} from '../Window';

describe('ClipboardEvent integration', () => {
  it('dispatches through the DOM event system with clipboardData preserved', () => {
    const document = new Window().document;
    const target = document.createElement('div');
    const clipboardData = {getData: () => 'hello'} as unknown as DataTransfer;
    const received: ClipboardEvent[] = [];

    target.addEventListener('paste', (event) => {
      received.push(event as ClipboardEvent);
    });
    target.dispatchEvent(new ClipboardEvent('paste', {clipboardData}));

    expect(received).toHaveLength(1);
    const seen = received[0]!;
    expect(seen.clipboardData).toBe(clipboardData);
    expect(seen.target).toBe(target);
  });
});
