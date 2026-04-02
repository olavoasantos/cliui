import {describe, expect, it} from 'vitest';

import {ErrorEvent} from '../ErrorEvent';

describe('ErrorEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const event = new ErrorEvent('error', {});

      expect(event.type).toBe('error');
    });

    it('sets message from eventInitDict', () => {
      const event = new ErrorEvent('error', {message: 'boom'});

      expect(event.message).toBe('boom');
    });

    it('sets filename from eventInitDict', () => {
      const event = new ErrorEvent('error', {filename: 'index.ts'});

      expect(event.filename).toBe('index.ts');
    });

    it('sets lineno from eventInitDict', () => {
      const event = new ErrorEvent('error', {lineno: 12});

      expect(event.lineno).toBe(12);
    });

    it('sets colno from eventInitDict', () => {
      const event = new ErrorEvent('error', {colno: 8});

      expect(event.colno).toBe(8);
    });

    it('sets error from eventInitDict', () => {
      const error = new TypeError('boom');
      const event = new ErrorEvent('error', {error});

      expect(event.error).toBe(error);
    });
  });
});
