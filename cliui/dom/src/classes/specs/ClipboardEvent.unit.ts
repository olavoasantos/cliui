import {describe, expect, it} from 'vitest';

import {ClipboardEvent} from '../ClipboardEvent';

describe('ClipboardEvent', () => {
  describe('constructor', () => {
    it('creates an event with the given type', () => {
      const event = new ClipboardEvent('paste');

      expect(event.type).toBe('paste');
    });

    it('sets clipboardData from eventInitDict', () => {
      const clipboardData = {getData: () => 'hello'} as unknown as DataTransfer;
      const event = new ClipboardEvent('paste', {clipboardData});

      expect(event.clipboardData).toBe(clipboardData);
    });

    it('defaults clipboardData to null when omitted', () => {
      const event = new ClipboardEvent('paste');

      expect(event.clipboardData).toBeNull();
    });
  });
});
