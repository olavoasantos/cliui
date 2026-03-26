import {describe, expect, it} from 'vitest';

import {CustomEvent} from '../CustomEvent';
import {Window} from '../Window';

describe('CustomEvent integration', () => {
  it('bubbles custom event detail through the DOM event system', () => {
    const document = new Window().document;
    const parent = document.createElement('div');
    const child = document.createElement('button');
    parent.appendChild(child);
    let detail: unknown;

    parent.addEventListener('ready', (event) => {
      detail = (event as CustomEvent).detail;
    });
    child.dispatchEvent(new CustomEvent('ready', {bubbles: true, detail: {ok: true}}));

    expect(detail).toEqual({ok: true});
  });
});
