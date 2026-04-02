import {describe, expect, it} from 'vitest';

import {FocusEvent} from '../FocusEvent';
import {Window} from '../Window';

describe('FocusEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const event = new FocusEvent('focus');

      expect(event.type).toBe('focus');
    });

    it('sets relatedTarget from eventInitDict', () => {
      const window = new Window();
      const relatedTarget = window.document.createElement('button');
      const event = new FocusEvent('focus', {relatedTarget});

      expect(event.relatedTarget).toBe(relatedTarget);
    });

    it('defaults relatedTarget to null when omitted', () => {
      const event = new FocusEvent('focus');

      expect(event.relatedTarget).toBeNull();
    });
  });
});
