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
    const captured: Event[] = [];

    parent.addEventListener('ping', (event) => {
      captured.push(event as Event);
    });
    child.dispatchEvent(new Event('ping', {bubbles: true}));

    expect(captured).toHaveLength(1);
    const seen = captured[0]!;
    expect(seen.target).toBe(child);
    expect(seen.currentTarget).toBe(parent);
    expect(seen.composedPath()).toContain(document.body);
  });
});
