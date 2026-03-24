import {describe, it, expect, vi} from 'vitest';
import {Window} from '../Window';
import {Event} from '../Event';
import {ErrorEvent} from '../ErrorEvent';

describe('Window', () => {
  describe('basic properties', () => {
    it('self-references window, self, parent, top', () => {
      const window = new Window();
      expect(window.window).toBe(window);
      expect(window.self).toBe(window);
      expect(window.parent).toBe(window);
      expect(window.top).toBe(window);
    });

    it('has a document', () => {
      const window = new Window();
      expect(window.document).toBeDefined();
      expect(window.document.defaultView).toBe(window);
    });

    it('has customElements registry', () => {
      const window = new Window();
      expect(window.customElements).toBeDefined();
    });

    it('has empty name by default', () => {
      const window = new Window();
      expect(window.name).toBe('');
    });
  });

  describe('class references', () => {
    it('exposes DOM constructors', () => {
      const window = new Window();
      expect(window.Event).toBeDefined();
      expect(window.Node).toBeDefined();
      expect(window.Element).toBeDefined();
      expect(window.Document).toBeDefined();
      expect(window.Text).toBeDefined();
      expect(window.Comment).toBeDefined();
      expect(window.DocumentFragment).toBeDefined();
      expect(window.CustomEvent).toBeDefined();
      expect(window.HTMLElement).toBeDefined();
      expect(window.SVGElement).toBeDefined();
      expect(window.MutationObserver).toBeDefined();
    });
  });

  describe('event target', () => {
    it('can add and dispatch events', () => {
      const window = new Window();
      const handler = vi.fn();
      window.addEventListener('test', handler);
      window.dispatchEvent(new Event('test'));
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('onerror', () => {
    it('registers an error handler', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      expect(window.onerror).toBe(handler);
    });

    it('calls onerror when error event is dispatched', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      const event = new ErrorEvent('error', {message: 'test error'});
      window.dispatchEvent(event);
      expect(handler).toHaveBeenCalledWith(
        'test error',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('removes previous handler when setting a new one', () => {
      const window = new Window();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      window.onerror = handler1;
      window.onerror = handler2;
      window.dispatchEvent(new ErrorEvent('error', {message: 'test'}));
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('clears handler when set to null', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      window.onerror = null;
      expect(window.onerror).toBeNull();
      window.dispatchEvent(new ErrorEvent('error', {message: 'test'}));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onunhandledrejection', () => {
    it('registers an unhandled rejection handler', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      expect(window.onunhandledrejection).toBe(handler);
    });

    it('calls handler when unhandledrejection event is dispatched', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      window.dispatchEvent(new Event('unhandledrejection'));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('clears handler when set to null', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      window.onunhandledrejection = null;
      expect(window.onunhandledrejection).toBeNull();
      window.dispatchEvent(new Event('unhandledrejection'));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
