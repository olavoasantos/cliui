import {describe, expect, it} from 'vitest';

import {WheelEvent} from '../WheelEvent';
import {Window} from '../Window';

describe('WheelEvent integration', () => {
  it('dispatches through DOM listeners with wheel delta metadata intact', () => {
    const target = new Window().document.createElement('div');
    const seen: WheelEvent[] = [];

    target.addEventListener('wheel', (event) => {
      seen.push(event as WheelEvent);
    });
    target.dispatchEvent(new WheelEvent('wheel', {deltaY: -120, ctrlKey: true}));

    expect(seen).toHaveLength(1);
    const event = seen[0]!;
    expect(event.deltaY).toBe(-120);
    expect(event.getModifierState('Control')).toBe(true);
  });
});
