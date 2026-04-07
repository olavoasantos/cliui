import {describe, it, expect, vi, afterEach} from 'vitest';
import {Clipboard} from '../Clipboard';

describe('Clipboard', () => {
  afterEach(() => {
    Clipboard.writeHandler = null;
    Clipboard.readHandler = null;
  });

  describe('writeText', () => {
    it('calls the write handler with the text', async () => {
      const handler = vi.fn();
      Clipboard.writeHandler = handler;

      const clipboard = new Clipboard();
      await clipboard.writeText('hello');

      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('resolves even without a handler', async () => {
      const clipboard = new Clipboard();
      await expect(clipboard.writeText('hello')).resolves.toBeUndefined();
    });
  });

  describe('readText', () => {
    it('returns text from the read handler', async () => {
      Clipboard.readHandler = () => 'clipboard content';

      const clipboard = new Clipboard();
      const result = await clipboard.readText();

      expect(result).toBe('clipboard content');
    });

    it('returns empty string when no read handler is set', async () => {
      const clipboard = new Clipboard();
      const result = await clipboard.readText();

      expect(result).toBe('');
    });
  });

  describe('integration with navigator', () => {
    it('is used via navigator.clipboard', async () => {
      const {Navigator} = await import('../Navigator');
      const navigator = new Navigator();

      expect(navigator.clipboard).toBeInstanceOf(Clipboard);
    });
  });
});
