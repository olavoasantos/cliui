import {describe, it, expect, vi} from 'vitest';
import {Window} from '../Window';
import {Event} from '../Event';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('EventTarget', () => {
  describe('addEventListener / removeEventListener', () => {
    it('adds and invokes an event listener', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const listener = vi.fn();

      el.addEventListener('click', listener);
      el.dispatchEvent(new Event('click'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('removes an event listener', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const listener = vi.fn();

      el.addEventListener('click', listener);
      el.removeEventListener('click', listener);
      el.dispatchEvent(new Event('click'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('ignores null listeners', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(() => el.addEventListener('click', null)).not.toThrow();
      expect(() => el.removeEventListener('click', null)).not.toThrow();
    });

    it('does not add duplicate listeners', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const listener = vi.fn();

      el.addEventListener('click', listener);
      el.addEventListener('click', listener);
      el.dispatchEvent(new Event('click'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('supports {once: true}', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const listener = vi.fn();

      el.addEventListener('click', listener, {once: true});
      el.dispatchEvent(new Event('click'));
      el.dispatchEvent(new Event('click'));

      expect(listener).toHaveBeenCalledOnce();
    });

    it('supports capture option', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const order: string[] = [];
      parent.addEventListener('click', () => order.push('capture'), {capture: true});
      parent.addEventListener('click', () => order.push('bubble'));

      child.dispatchEvent(new Event('click', {bubbles: true}));

      expect(order).toEqual(['capture', 'bubble']);
    });

    it('supports EventListenerObject', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const handler = {handleEvent: vi.fn()};

      el.addEventListener('click', handler);
      el.dispatchEvent(new Event('click'));

      expect(handler.handleEvent).toHaveBeenCalledOnce();
    });

    it('supports AbortSignal to remove listener', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const listener = vi.fn();
      const controller = new AbortController();

      el.addEventListener('click', listener, {signal: controller.signal});
      controller.abort();
      el.dispatchEvent(new Event('click'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispatchEvent', () => {
    it('sets event target and srcElement', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      let capturedEvent: Event | null = null;

      el.addEventListener('test', (e) => {
        capturedEvent = e as Event;
      });
      el.dispatchEvent(new Event('test'));

      expect(capturedEvent!.target).toBe(el);
      expect(capturedEvent!.srcElement).toBe(el);
    });

    it('bubbles events up the tree', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const parentListener = vi.fn();
      parent.addEventListener('click', parentListener);

      child.dispatchEvent(new Event('click', {bubbles: true}));

      expect(parentListener).toHaveBeenCalledOnce();
    });

    it('does not bubble non-bubbling events', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const parentListener = vi.fn();
      parent.addEventListener('focus', parentListener);

      child.dispatchEvent(new Event('focus', {bubbles: false}));

      expect(parentListener).not.toHaveBeenCalled();
    });

    it('stops propagation when stopPropagation is called', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const parentListener = vi.fn();
      parent.addEventListener('click', parentListener);

      child.addEventListener('click', (e) => {
        (e as Event).stopPropagation();
      });

      child.dispatchEvent(new Event('click', {bubbles: true}));

      expect(parentListener).not.toHaveBeenCalled();
    });

    it('stops immediate propagation', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const first = vi.fn((e: unknown) => (e as Event).stopImmediatePropagation());
      const second = vi.fn();

      el.addEventListener('click', first);
      el.addEventListener('click', second);
      el.dispatchEvent(new Event('click'));

      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    });

    it('builds the composed path', () => {
      const {document} = createEnv();
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      let path: unknown[] = [];
      child.addEventListener('click', (e) => {
        path = (e as Event).composedPath();
      });
      child.dispatchEvent(new Event('click', {bubbles: true}));

      expect(path[0]).toBe(child);
      expect(path[1]).toBe(parent);
      expect(path).toContain(document.body);
    });

    it('returns defaultPrevented state', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.addEventListener('click', (e) => (e as Event).preventDefault());

      const result = el.dispatchEvent(new Event('click'));
      expect(result).toBe(true);
    });
  });
});
