import {describe, expect, it} from 'vitest';

import {PromiseRejectionEvent} from '../PromiseRejectionEvent';

describe('PromiseRejectionEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const promise = Promise.resolve();
      const event = new PromiseRejectionEvent('unhandledrejection', {promise, reason: 'boom'});

      expect(event.type).toBe('unhandledrejection');
    });

    it('sets promise from eventInitDict', () => {
      const promise = Promise.resolve('ok');
      const event = new PromiseRejectionEvent('unhandledrejection', {promise, reason: null});

      expect(event.promise).toBe(promise);
    });

    it('sets reason from eventInitDict', () => {
      const promise = Promise.resolve();
      const reason = new Error('boom');
      const event = new PromiseRejectionEvent('unhandledrejection', {promise, reason});

      expect(event.reason).toBe(reason);
    });
  });
});
