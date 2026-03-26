import {describe, it} from 'vitest';

import {CustomEvent} from '../CustomEvent';

describe('CustomEvent', () => {
  describe('constructor', () => {
    it.todo('creates an event with the given type');
    it.todo('sets detail from eventInitDict');
    it.todo('defaults detail to undefined when omitted');
    it.todo('passes bubbles and cancelable to the parent Event constructor');
  });

  describe('initCustomEvent', () => {
    it.todo('reinitializes the event type');
    it.todo('updates bubbles and cancelable');
    it.todo('updates detail');
  });
});
