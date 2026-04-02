import {describe, expect, it} from 'vitest';

import {CustomEvent} from '../CustomEvent';

describe('CustomEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const event = new CustomEvent('build');

      expect(event.type).toBe('build');
    });

    it('sets detail from eventInitDict', () => {
      const event = new CustomEvent('build', {detail: {id: 1}});

      expect(event.detail).toEqual({id: 1});
    });

    it('defaults detail to undefined when omitted', () => {
      const event = new CustomEvent('build');

      expect(event.detail).toBeUndefined();
    });

    it('passes bubbles and cancelable to the parent Event constructor', () => {
      const event = new CustomEvent('build', {bubbles: true, cancelable: true});

      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });
  });

  describe('initCustomEvent', () => {
    it('reinitializes the event type', () => {
      const event = new CustomEvent('before');

      event.initCustomEvent('after');

      expect(event.type).toBe('after');
    });

    it('updates bubbles and cancelable', () => {
      const event = new CustomEvent('build');

      event.initCustomEvent('build', true, true);

      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });

    it('updates detail', () => {
      const event = new CustomEvent('build', {detail: 'first'});

      event.initCustomEvent('build', false, false, 'second');

      expect(event.detail).toBe('second');
    });
  });
});
