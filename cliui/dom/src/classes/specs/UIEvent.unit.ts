import {describe, it, expect} from 'vitest';
import {UIEvent} from '../UIEvent';

describe('UIEvent', () => {
  it('creates a UIEvent with the given type', () => {
    const event = new UIEvent('click');
    expect(event.type).toBe('click');
  });

  it('has default property values', () => {
    const event = new UIEvent('test');
    expect(event.detail).toBe(0);
    expect(event.view).toBe(null);
    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });

  it('accepts UIEvent-specific options', () => {
    const view = {};
    const event = new UIEvent('test', {detail: 42, view, bubbles: true});
    expect(event.detail).toBe(42);
    expect(event.view).toBe(view);
    expect(event.bubbles).toBe(true);
  });

  it('inherits Event methods', () => {
    const event = new UIEvent('test', {cancelable: true});
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});
