import {describe, expect, it} from 'vitest';

import {KeyboardEvent} from '../KeyboardEvent';
import {Window} from '../Window';

describe('KeyboardEvent integration', () => {
  it('dispatches through DOM listeners with keyboard metadata intact', () => {
    const target = new Window().document.createElement('input');
    let seen: KeyboardEvent | null = null;

    target.addEventListener('keydown', (event) => {
      seen = event as KeyboardEvent;
    });
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', code: 'KeyA', ctrlKey: true}));

    expect(seen?.key).toBe('a');
    expect(seen?.getModifierState('Control')).toBe(true);
  });
});
