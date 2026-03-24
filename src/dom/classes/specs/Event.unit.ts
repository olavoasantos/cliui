import {describe, it, expect} from 'vitest';
import {Event} from '../Event';
import {EventPhase} from '../../constants/index';

describe('Event', () => {
  it('creates an event with the given type', () => {
    const event = new Event('click');
    expect(event.type).toBe('click');
  });

  it('has default property values', () => {
    const event = new Event('test');
    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
    expect(event.composed).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(event.cancelBubble).toBe(false);
    expect(event.target).toBe(null);
    expect(event.currentTarget).toBe(null);
    expect(event.eventPhase).toBe(EventPhase.NONE);
    expect(event.isTrusted).toBe(false);
    expect(event.timeStamp).toBeGreaterThan(0);
  });

  it('accepts options', () => {
    const event = new Event('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('exposes static phase constants', () => {
    expect(Event.NONE).toBe(0);
    expect(Event.CAPTURING_PHASE).toBe(1);
    expect(Event.AT_TARGET).toBe(2);
    expect(Event.BUBBLING_PHASE).toBe(3);
  });

  it('stops propagation', () => {
    const event = new Event('test');
    expect(event.cancelBubble).toBe(false);
    event.stopPropagation();
    expect(event.cancelBubble).toBe(true);
  });

  it('stops immediate propagation', () => {
    const event = new Event('test');
    event.stopImmediatePropagation();
    expect(event.cancelBubble).toBe(true);
  });

  it('prevents default', () => {
    const event = new Event('test');
    expect(event.defaultPrevented).toBe(false);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns composed path', () => {
    const event = new Event('test');
    expect(event.composedPath()).toEqual([]);
  });

  it('supports initEvent', () => {
    const event = new Event('');
    event.initEvent('click', true, true);
    expect(event.type).toBe('click');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  it('supports returnValue as alias for defaultPrevented', () => {
    const event = new Event('test');
    event.returnValue = true;
    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe(true);
  });
});
