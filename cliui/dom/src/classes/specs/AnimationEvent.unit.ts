import {describe, it, expect} from 'vitest';
import {AnimationEvent} from '../AnimationEvent';

describe('AnimationEvent', () => {
  it('creates with type and default properties', () => {
    const event = new AnimationEvent('animationend');
    expect(event.type).toBe('animationend');
    expect(event.animationName).toBe('');
    expect(event.elapsedTime).toBe(0);
    expect(event.pseudoElement).toBe('');
    expect(event.bubbles).toBe(true);
  });

  it('accepts options', () => {
    const event = new AnimationEvent('animationstart', {
      animationName: 'fadeIn',
      elapsedTime: 1.5,
    });
    expect(event.animationName).toBe('fadeIn');
    expect(event.elapsedTime).toBe(1.5);
  });

  it('bubbles by default', () => {
    const event = new AnimationEvent('animationiteration');
    expect(event.bubbles).toBe(true);
  });

  it('supports all animation event types', () => {
    for (const type of [
      'animationstart',
      'animationend',
      'animationiteration',
      'animationcancel',
    ]) {
      const event = new AnimationEvent(type);
      expect(event.type).toBe(type);
    }
  });
});
