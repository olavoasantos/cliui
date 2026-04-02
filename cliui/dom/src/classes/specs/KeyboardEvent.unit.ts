import {describe, it, expect} from 'vitest';
import {KeyboardEvent} from '../KeyboardEvent';

describe('KeyboardEvent', () => {
  it('creates a KeyboardEvent with the given type', () => {
    const event = new KeyboardEvent('keydown');
    expect(event.type).toBe('keydown');
  });

  it('has default property values', () => {
    const event = new KeyboardEvent('keydown');
    expect(event.key).toBe('');
    expect(event.code).toBe('');
    expect(event.location).toBe(0);
    expect(event.ctrlKey).toBe(false);
    expect(event.shiftKey).toBe(false);
    expect(event.altKey).toBe(false);
    expect(event.metaKey).toBe(false);
    expect(event.repeat).toBe(false);
    expect(event.isComposing).toBe(false);
    expect(event.detail).toBe(0);
    expect(event.view).toBe(null);
  });

  it('accepts keyboard-specific options', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      metaKey: true,
      repeat: true,
      isComposing: true,
      location: KeyboardEvent.DOM_KEY_LOCATION_LEFT,
      bubbles: true,
    });
    expect(event.key).toBe('a');
    expect(event.code).toBe('KeyA');
    expect(event.ctrlKey).toBe(true);
    expect(event.shiftKey).toBe(true);
    expect(event.altKey).toBe(true);
    expect(event.metaKey).toBe(true);
    expect(event.repeat).toBe(true);
    expect(event.isComposing).toBe(true);
    expect(event.location).toBe(1);
    expect(event.bubbles).toBe(true);
  });

  it('exposes static key location constants', () => {
    expect(KeyboardEvent.DOM_KEY_LOCATION_STANDARD).toBe(0);
    expect(KeyboardEvent.DOM_KEY_LOCATION_LEFT).toBe(1);
    expect(KeyboardEvent.DOM_KEY_LOCATION_RIGHT).toBe(2);
    expect(KeyboardEvent.DOM_KEY_LOCATION_NUMPAD).toBe(3);
  });

  it('returns modifier state via getModifierState', () => {
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      altKey: true,
      metaKey: false,
      shiftKey: false,
    });
    expect(event.getModifierState('Control')).toBe(true);
    expect(event.getModifierState('Alt')).toBe(true);
    expect(event.getModifierState('Meta')).toBe(false);
    expect(event.getModifierState('Shift')).toBe(false);
    expect(event.getModifierState('CapsLock')).toBe(false);
  });

  it('inherits UIEvent properties', () => {
    const event = new KeyboardEvent('keydown', {detail: 5});
    expect(event.detail).toBe(5);
  });
});
