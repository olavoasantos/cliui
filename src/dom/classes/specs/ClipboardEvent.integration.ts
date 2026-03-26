import {describe, expect, it} from 'vitest';

import {ClipboardEvent} from '../ClipboardEvent';
import {Window} from '../Window';

describe('ClipboardEvent integration', () => {
  it('dispatches through the DOM event system with clipboardData preserved', () => {
    const document = new Window().document;
    const target = document.createElement('div');
    const clipboardData = {getData: () => 'hello'} as unknown as DataTransfer;
    let received: ClipboardEvent | null = null;

    target.addEventListener('paste', (event) => {
      received = event as ClipboardEvent;
    });
    target.dispatchEvent(new ClipboardEvent('paste', {clipboardData}));

    expect(received?.clipboardData).toBe(clipboardData);
    expect(received?.target).toBe(target);
  });
});
