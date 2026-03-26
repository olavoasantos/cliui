import {describe, expect, it} from 'vitest';

import {WheelEvent} from '../WheelEvent';
import {Window} from '../Window';

describe('WheelEvent integration', () => {
  it('dispatches through DOM listeners with wheel delta metadata intact', () => {
    const target = new Window().document.createElement('div');
    let seen: WheelEvent | null = null;

    target.addEventListener('wheel', (event) => {
      seen = event as WheelEvent;
    });
    target.dispatchEvent(new WheelEvent('wheel', {deltaY: -120, ctrlKey: true}));

    expect(seen?.deltaY).toBe(-120);
    expect(seen?.getModifierState('Control')).toBe(true);
  });
});
