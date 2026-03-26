import {describe, expect, it} from 'vitest';

import {MouseEvent} from '../MouseEvent';
import {Window} from '../Window';

describe('MouseEvent integration', () => {
  it('dispatches through DOM listeners with pointer coordinates and relatedTarget intact', () => {
    const document = new Window().document;
    const target = document.createElement('button');
    const relatedTarget = document.createElement('div');
    let seen: MouseEvent | null = null;

    target.addEventListener('click', (event) => {
      seen = event as MouseEvent;
    });
    target.dispatchEvent(new MouseEvent('click', {clientX: 4, clientY: 7, relatedTarget}));

    expect(seen?.clientX).toBe(4);
    expect(seen?.relatedTarget).toBe(relatedTarget);
  });
});
