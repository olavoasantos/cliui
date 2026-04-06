import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {V8InspectorProxy} from '../V8InspectorProxy';

import type {CDPEvent, CDPMethodHandler, DomainProxyHandler} from '../../types';

function createMockTransport() {
  const handlers = new Map<string, CDPMethodHandler>();
  const domainProxies = new Map<string, DomainProxyHandler>();
  const events: CDPEvent[] = [];

  return {
    handlers,
    domainProxies,
    events,
    registerMethod(method: string, handler: CDPMethodHandler) {
      handlers.set(method, handler);
    },
    registerDomainProxy(domain: string, handler: DomainProxyHandler) {
      domainProxies.set(domain, handler);
    },
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
  };
}

describe('V8InspectorProxy', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let proxy: V8InspectorProxy;

  beforeEach(() => {
    transport = createMockTransport();
    proxy = new V8InspectorProxy(transport as any);
  });

  afterEach(() => {
    proxy.close();
  });

  it('connects to the V8 inspector session', () => {
    const result = proxy.connect();
    expect(result).toBe(true);
    expect(proxy.isConnected).toBe(true);
  });

  it('registers domain proxies for Debugger, Profiler, HeapProfiler', () => {
    proxy.connect();
    expect(transport.domainProxies.has('Debugger')).toBe(true);
    expect(transport.domainProxies.has('Profiler')).toBe(true);
    expect(transport.domainProxies.has('HeapProfiler')).toBe(true);
  });

  it('forwards Profiler commands to V8 and returns real results', async () => {
    proxy.connect();

    // Profiler.enable
    const enableResult = await proxy.post('Profiler.enable');
    expect(enableResult).toEqual({});

    // Profiler.start + stop returns real profile with nodes
    await proxy.post('Profiler.start');
    await new Promise((r) => setTimeout(r, 50));
    const stopResult = await proxy.post('Profiler.stop');
    expect(stopResult.profile).toBeDefined();
    expect((stopResult.profile as any).nodes.length).toBeGreaterThan(0);
  });

  it('forwards Debugger.enable and receives scriptParsed events', async () => {
    proxy.connect();

    await proxy.post('Debugger.enable');

    // V8 emits Debugger.scriptParsed events on enable
    await new Promise((r) => setTimeout(r, 50));
    const scriptEvents = transport.events.filter((e) => e.method === 'Debugger.scriptParsed');
    expect(scriptEvents.length).toBeGreaterThan(0);

    await proxy.post('Debugger.disable');
  });

  it('forwards HeapProfiler commands', async () => {
    proxy.connect();

    const result = await proxy.post('HeapProfiler.enable');
    expect(result).toEqual({});

    await proxy.post('HeapProfiler.disable');
  });

  it('rejects commands when not connected', async () => {
    // Don't call connect()
    await expect(proxy.post('Profiler.enable')).rejects.toThrow('not connected');
  });

  it('disconnects cleanly', () => {
    proxy.connect();
    expect(proxy.isConnected).toBe(true);

    proxy.close();
    expect(proxy.isConnected).toBe(false);
  });

  it('handles double close gracefully', () => {
    proxy.connect();
    proxy.close();
    expect(() => proxy.close()).not.toThrow();
  });

  it('domain proxy handler forwards commands and returns results', async () => {
    proxy.connect();

    const proxyHandler = transport.domainProxies.get('Profiler')!;
    expect(proxyHandler).toBeDefined();

    // Call through the domain proxy (simulating CDPTransport dispatch)
    const result = await proxyHandler('Profiler.enable', {}, null as any, 1);
    expect(result).toEqual({});
  });
});
