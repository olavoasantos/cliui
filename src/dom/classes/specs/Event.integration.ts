import {describe, expect, it} from 'vitest';

import {Event} from '../Event';
import {Window} from '../Window';

describe('Event integration', () => {
  it('tracks target, currentTarget, and composedPath during bubbling dispatch', () => {
    const document = new Window().document;
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    let captured: Event | null = null;

    parent.addEventListener('ping', (event) => {
      captured = event as Event;
    });
    child.dispatchEvent(new Event('ping', {bubbles: true}));

    expect(captured?.target).toBe(child);
    expect(captured?.currentTarget).toBe(parent);
    expect(captured?.composedPath()).toContain(document.body);
  });
});
