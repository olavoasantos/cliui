import {describe, it, expect, vi, afterEach} from 'vitest';
import {Notification} from '../Notification';

describe('Notification', () => {
  afterEach(() => {
    Notification.handler = null;
  });

  describe('static properties', () => {
    it('has permission always set to granted', () => {
      expect(Notification.permission).toBe('granted');
    });

    it('requestPermission resolves to granted', async () => {
      const result = await Notification.requestPermission();
      expect(result).toBe('granted');
    });
  });

  describe('constructor', () => {
    it('sets title from constructor argument', () => {
      const notification = new Notification('Hello');
      expect(notification.title).toBe('Hello');
    });

    it('sets body from options', () => {
      const notification = new Notification('Title', {body: 'Body text'});
      expect(notification.body).toBe('Body text');
    });

    it('defaults body to empty string', () => {
      const notification = new Notification('Title');
      expect(notification.body).toBe('');
    });

    it('sets tag from options', () => {
      const notification = new Notification('Title', {tag: 'my-tag'});
      expect(notification.tag).toBe('my-tag');
    });

    it('ignores icon in terminal context', () => {
      const notification = new Notification('Title', {icon: '/path/to/icon.png'});
      expect(notification.icon).toBe('/path/to/icon.png');
    });

    it('calls handler when created', () => {
      const handler = vi.fn();
      Notification.handler = handler;

      new Notification('Alert', {body: 'Something happened'});

      expect(handler).toHaveBeenCalledWith('Alert', 'Something happened');
    });

    it('does not throw when handler is null', () => {
      Notification.handler = null;
      expect(() => new Notification('Title')).not.toThrow();
    });
  });

  describe('events', () => {
    it('dispatches show event asynchronously', async () => {
      const showHandler = vi.fn();
      const notification = new Notification('Title');
      notification.addEventListener('show', showHandler);

      // Show event is dispatched via queueMicrotask
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(showHandler).toHaveBeenCalledOnce();
    });

    it('calls onshow handler', async () => {
      const notification = new Notification('Title');
      notification.onshow = vi.fn();

      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(notification.onshow).toHaveBeenCalledOnce();
    });

    it('dispatches close event when close() is called', () => {
      const closeHandler = vi.fn();
      const notification = new Notification('Title');
      notification.addEventListener('close', closeHandler);

      notification.close();

      expect(closeHandler).toHaveBeenCalledOnce();
    });

    it('calls onclose handler when close() is called', () => {
      const notification = new Notification('Title');
      notification.onclose = vi.fn();

      notification.close();

      expect(notification.onclose).toHaveBeenCalledOnce();
    });
  });
});
