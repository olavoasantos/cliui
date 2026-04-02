import {describe, expect, it} from 'vitest';

import {InputEvent} from '../InputEvent';
import {Window} from '../Window';

describe('InputEvent integration', () => {
  it('dispatches through the DOM event system with data and inputType preserved', () => {
    const document = new Window().document;
    const target = document.createElement('div');
    const received: InputEvent[] = [];

    target.addEventListener('input', (event) => {
      received.push(event as InputEvent);
    });
    target.dispatchEvent(
      new InputEvent('input', {bubbles: true, data: 'a', inputType: 'insertText'}),
    );

    expect(received).toHaveLength(1);
    const seen = received[0]!;
    expect(seen.data).toBe('a');
    expect(seen.inputType).toBe('insertText');
    expect(seen.target).toBe(target);
  });
});
