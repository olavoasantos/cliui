import {describe, it, expect} from 'vitest';
import {TransitionEvent} from '../TransitionEvent';

describe('TransitionEvent', () => {
  it('creates with type and default properties', () => {
    const event = new TransitionEvent('transitionend');
    expect(event.type).toBe('transitionend');
    expect(event.propertyName).toBe('');
    expect(event.elapsedTime).toBe(0);
    expect(event.pseudoElement).toBe('');
    expect(event.bubbles).toBe(true);
  });

  it('accepts options', () => {
    const event = new TransitionEvent('transitionend', {
      propertyName: 'color',
      elapsedTime: 0.2,
      pseudoElement: '',
    });
    expect(event.propertyName).toBe('color');
    expect(event.elapsedTime).toBe(0.2);
  });

  it('bubbles by default', () => {
    const event = new TransitionEvent('transitionstart');
    expect(event.bubbles).toBe(true);
  });

  it('supports all transition event types', () => {
    for (const type of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) {
      const event = new TransitionEvent(type);
      expect(event.type).toBe(type);
    }
  });
});
