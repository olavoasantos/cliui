import {describe, expect, it} from 'vitest';

import {ToggleEvent} from '../ToggleEvent';
import {Window} from '../Window';

describe('ToggleEvent integration', () => {
  it('dispatches through DOM listeners with old and new state metadata intact', () => {
    const target = new Window().document.createElement('details');
    const seen: ToggleEvent[] = [];

    target.addEventListener('toggle', (event) => {
      seen.push(event as ToggleEvent);
    });
    target.dispatchEvent(new ToggleEvent('toggle', {oldState: 'closed', newState: 'open'}));

    expect(seen).toHaveLength(1);
    const event = seen[0]!;
    expect(event.oldState).toBe('closed');
    expect(event.newState).toBe('open');
  });
});
