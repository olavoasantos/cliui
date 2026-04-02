import {describe, expect, it} from 'vitest';

import {KeyboardEvent} from '../KeyboardEvent';
import {Window} from '../Window';

describe('KeyboardEvent integration', () => {
  it('dispatches through DOM listeners with keyboard metadata intact', () => {
    const target = new Window().document.createElement('input');
    const seen: KeyboardEvent[] = [];

    target.addEventListener('keydown', (event) => {
      seen.push(event as KeyboardEvent);
    });
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', code: 'KeyA', ctrlKey: true}));

    expect(seen).toHaveLength(1);
    const event = seen[0]!;
    expect(event.key).toBe('a');
    expect(event.getModifierState('Control')).toBe(true);
  });
});
