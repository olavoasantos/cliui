import {describe, expect, it} from 'vitest';

import {ToggleEvent} from '../ToggleEvent';
import {Window} from '../Window';

describe('ToggleEvent integration', () => {
  it('dispatches through DOM listeners with old and new state metadata intact', () => {
    const target = new Window().document.createElement('details');
    let seen: ToggleEvent | null = null;

    target.addEventListener('toggle', (event) => {
      seen = event as ToggleEvent;
    });
    target.dispatchEvent(new ToggleEvent('toggle', {oldState: 'closed', newState: 'open'}));

    expect(seen?.oldState).toBe('closed');
    expect(seen?.newState).toBe('open');
  });
});
