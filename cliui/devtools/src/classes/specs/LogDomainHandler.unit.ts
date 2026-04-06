import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {Window} from '@cliui/dom';
import {ObjectRegistry} from '../ObjectRegistry';
import {RuntimeDomainHandler} from '../RuntimeDomainHandler';
import {LogDomainHandler} from '../LogDomainHandler';
import {NodeRegistry} from '../NodeRegistry';
import {DOMDomainHandler} from '../DOMDomainHandler';

import type {CDPEvent, CDPMethodHandler} from '../../types';

function createMockTransport() {
  const handlers = new Map<string, CDPMethodHandler>();
  const events: CDPEvent[] = [];
  return {
    handlers,
    events,
    registerMethod(method: string, handler: CDPMethodHandler) {
      handlers.set(method, handler);
    },
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
    async call(method: string, params: Record<string, unknown> = {}) {
      const handler = handlers.get(method);
      if (!handler) throw new Error(`No handler for ${method}`);
      return (await handler(params)) ?? {};
    },
  };
}

describe('LogDomainHandler', () => {
  let window: InstanceType<typeof Window>;
  let transport: ReturnType<typeof createMockTransport>;
  let handler: LogDomainHandler;

  // Save originals before any test
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  beforeEach(() => {
    window = new Window();
    transport = createMockTransport();
    const objectRegistry = new ObjectRegistry();
    const nodeRegistry = new NodeRegistry();
    const domHandler = new DOMDomainHandler(transport as any, nodeRegistry, window.document);
    const runtimeHandler = new RuntimeDomainHandler(
      transport as any,
      objectRegistry,
      window,
      window.document,
      domHandler,
      null,
    );

    handler = new LogDomainHandler(transport as any, objectRegistry, runtimeHandler);
    handler.register();
  });

  afterEach(() => {
    // Always restore console
    handler.restore();
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.info = originalInfo;
  });

  describe('Log.enable', () => {
    it('returns empty result', async () => {
      const result = await transport.call('Log.enable');
      expect(result).toEqual({});
    });

    it('marks handler as enabled', async () => {
      await transport.call('Log.enable');
      expect(handler.isEnabled).toBe(true);
    });
  });

  describe('Log.disable', () => {
    it('restores console methods', async () => {
      await transport.call('Log.enable');
      const interceptedLog = console.log;

      await transport.call('Log.disable');
      expect(console.log).not.toBe(interceptedLog);
      expect(handler.isEnabled).toBe(false);
    });
  });

  describe('console interception', () => {
    it('emits Log.entryAdded for console.log', async () => {
      // Suppress actual output during test
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await transport.call('Log.enable');
      console.log('test message');

      const event = transport.events.find((e) => e.method === 'Log.entryAdded');
      expect(event).toBeDefined();
      expect((event!.params.entry as any).level).toBe('info');
      expect((event!.params.entry as any).text).toBe('test message');

      spy.mockRestore();
    });

    it('emits Log.entryAdded for console.warn', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await transport.call('Log.enable');
      console.warn('warning message');

      const event = transport.events.find((e) => e.method === 'Log.entryAdded');
      expect(event).toBeDefined();
      expect((event!.params.entry as any).level).toBe('warning');

      spy.mockRestore();
    });

    it('emits Log.entryAdded for console.error', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await transport.call('Log.enable');
      console.error('error message');

      const event = transport.events.find((e) => e.method === 'Log.entryAdded');
      expect(event).toBeDefined();
      expect((event!.params.entry as any).level).toBe('error');

      spy.mockRestore();
    });

    it('also emits Runtime.consoleAPICalled', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await transport.call('Log.enable');
      console.log('test');

      const event = transport.events.find(
        (e) => e.method === 'Runtime.consoleAPICalled',
      );
      expect(event).toBeDefined();
      expect(event!.params.type).toBe('log');

      spy.mockRestore();
    });

    it('preserves original console output', async () => {
      let originalCalled = false;
      const origLog = console.log;
      console.log = (..._args: unknown[]) => {
        originalCalled = true;
      };

      await transport.call('Log.enable');
      console.log('test');

      expect(originalCalled).toBe(true);

      console.log = origLog;
    });

    it('handles multiple arguments', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await transport.call('Log.enable');
      console.log('hello', 42, {key: 'value'});

      const event = transport.events.find((e) => e.method === 'Log.entryAdded');
      expect(event).toBeDefined();
      expect((event!.params.entry as any).text).toContain('hello');
      expect((event!.params.entry as any).text).toContain('42');

      spy.mockRestore();
    });

    it('stops emitting after disable', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await transport.call('Log.enable');
      await transport.call('Log.disable');

      console.log('should not be forwarded');

      const events = transport.events.filter((e) => e.method === 'Log.entryAdded');
      expect(events.length).toBe(0);

      spy.mockRestore();
    });
  });
});
