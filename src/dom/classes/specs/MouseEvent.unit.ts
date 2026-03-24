import {describe, it, expect} from 'vitest';
import {MouseEvent} from '../MouseEvent';
import {EventTarget} from '../EventTarget';

describe('MouseEvent', () => {
  it('creates a MouseEvent with the given type', () => {
    const event = new MouseEvent('click');
    expect(event.type).toBe('click');
  });

  it('has default property values', () => {
    const event = new MouseEvent('click');
    expect(event.screenX).toBe(0);
    expect(event.screenY).toBe(0);
    expect(event.clientX).toBe(0);
    expect(event.clientY).toBe(0);
    expect(event.ctrlKey).toBe(false);
    expect(event.shiftKey).toBe(false);
    expect(event.altKey).toBe(false);
    expect(event.metaKey).toBe(false);
    expect(event.button).toBe(0);
    expect(event.buttons).toBe(0);
    expect(event.relatedTarget).toBe(null);
    expect(event.detail).toBe(0);
    expect(event.view).toBe(null);
  });

  it('accepts mouse-specific options', () => {
    const related = new EventTarget();
    const event = new MouseEvent('click', {
      screenX: 100,
      screenY: 200,
      clientX: 50,
      clientY: 75,
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      metaKey: true,
      button: 2,
      buttons: 3,
      relatedTarget: related,
      bubbles: true,
    });
    expect(event.screenX).toBe(100);
    expect(event.screenY).toBe(200);
    expect(event.clientX).toBe(50);
    expect(event.clientY).toBe(75);
    expect(event.ctrlKey).toBe(true);
    expect(event.shiftKey).toBe(true);
    expect(event.altKey).toBe(true);
    expect(event.metaKey).toBe(true);
    expect(event.button).toBe(2);
    expect(event.buttons).toBe(3);
    expect(event.relatedTarget).toBe(related);
    expect(event.bubbles).toBe(true);
  });

  it('returns modifier state via getModifierState', () => {
    const event = new MouseEvent('click', {
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: true,
    });
    expect(event.getModifierState('Control')).toBe(true);
    expect(event.getModifierState('Meta')).toBe(true);
    expect(event.getModifierState('Alt')).toBe(false);
    expect(event.getModifierState('Shift')).toBe(false);
  });

  it('inherits UIEvent properties', () => {
    const event = new MouseEvent('click', {detail: 2});
    expect(event.detail).toBe(2);
  });
});
