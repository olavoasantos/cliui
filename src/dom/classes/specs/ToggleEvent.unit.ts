import {describe, expect, it} from 'vitest';

import {ToggleEvent} from '../ToggleEvent';

describe('ToggleEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const event = new ToggleEvent('toggle', {});

      expect(event.type).toBe('toggle');
    });

    it('sets oldState from eventInitDict', () => {
      const event = new ToggleEvent('toggle', {oldState: 'closed'});

      expect(event.oldState).toBe('closed');
    });

    it('sets newState from eventInitDict', () => {
      const event = new ToggleEvent('toggle', {newState: 'open'});

      expect(event.newState).toBe('open');
    });
  });
});
