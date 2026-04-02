import {describe, expect, it} from 'vitest';

import {MouseEvent} from '../MouseEvent';
import {Window} from '../Window';

describe('MouseEvent integration', () => {
  it('dispatches through DOM listeners with pointer coordinates and relatedTarget intact', () => {
    const document = new Window().document;
    const target = document.createElement('button');
    const relatedTarget = document.createElement('div');
    const seen: MouseEvent[] = [];

    target.addEventListener('click', (event) => {
      seen.push(event as MouseEvent);
    });
    target.dispatchEvent(new MouseEvent('click', {clientX: 4, clientY: 7, relatedTarget}));

    expect(seen).toHaveLength(1);
    const event = seen[0]!;
    expect(event.clientX).toBe(4);
    expect(event.relatedTarget).toBe(relatedTarget);
  });
});
