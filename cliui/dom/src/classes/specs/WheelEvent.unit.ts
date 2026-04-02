import {describe, it, expect} from 'vitest';
import {WheelEvent} from '../WheelEvent';

describe('WheelEvent', () => {
  it('creates a WheelEvent with the given type', () => {
    const event = new WheelEvent('wheel');
    expect(event.type).toBe('wheel');
  });

  it('has default property values', () => {
    const event = new WheelEvent('wheel');
    expect(event.deltaX).toBe(0);
    expect(event.deltaY).toBe(0);
    expect(event.deltaZ).toBe(0);
    expect(event.deltaMode).toBe(0);
    expect(event.clientX).toBe(0);
    expect(event.clientY).toBe(0);
    expect(event.button).toBe(0);
  });

  it('accepts wheel-specific options', () => {
    const event = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: -120,
      deltaZ: 0,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      clientX: 50,
      clientY: 75,
      bubbles: true,
    });
    expect(event.deltaX).toBe(10);
    expect(event.deltaY).toBe(-120);
    expect(event.deltaZ).toBe(0);
    expect(event.deltaMode).toBe(1);
    expect(event.clientX).toBe(50);
    expect(event.clientY).toBe(75);
    expect(event.bubbles).toBe(true);
  });

  it('exposes static delta mode constants', () => {
    expect(WheelEvent.DOM_DELTA_PIXEL).toBe(0);
    expect(WheelEvent.DOM_DELTA_LINE).toBe(1);
    expect(WheelEvent.DOM_DELTA_PAGE).toBe(2);
  });

  it('inherits MouseEvent properties', () => {
    const event = new WheelEvent('wheel', {
      ctrlKey: true,
      altKey: true,
    });
    expect(event.ctrlKey).toBe(true);
    expect(event.altKey).toBe(true);
    expect(event.getModifierState('Control')).toBe(true);
  });
});
