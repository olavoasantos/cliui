import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {NetworkDomainHandler} from '../NetworkDomainHandler';

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

describe('NetworkDomainHandler', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let handler: NetworkDomainHandler;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    transport = createMockTransport();
    handler = new NetworkDomainHandler(transport as any);
    handler.register();
  });

  afterEach(() => {
    handler.restore();
    globalThis.fetch = originalFetch;
  });

  it('enables and disables without error', async () => {
    await transport.call('Network.enable');
    expect(handler.isEnabled).toBe(true);

    await transport.call('Network.disable');
    expect(handler.isEnabled).toBe(false);
  });

  it('intercepts fetch and emits requestWillBeSent', async () => {
    // Mock the underlying fetch
    const mockResponse = new Response('{"ok":true}', {
      status: 200,
      headers: {'content-type': 'application/json'},
    });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await transport.call('Network.enable');

    // The intercepted fetch wraps our mock
    const interceptedFetch = globalThis.fetch;
    await interceptedFetch('https://api.example.com/data');

    const reqEvent = transport.events.find((e) => e.method === 'Network.requestWillBeSent');
    expect(reqEvent).toBeDefined();
    expect((reqEvent!.params.request as any).url).toBe('https://api.example.com/data');
    expect((reqEvent!.params.request as any).method).toBe('GET');
  });

  it('emits responseReceived with status and headers', async () => {
    const mockResponse = new Response('hello', {
      status: 201,
      headers: {'x-custom': 'value'},
    });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await transport.call('Network.enable');
    await globalThis.fetch('https://api.example.com/create', {method: 'POST'});

    const resEvent = transport.events.find((e) => e.method === 'Network.responseReceived');
    expect(resEvent).toBeDefined();
    expect((resEvent!.params.response as any).status).toBe(201);
  });

  it('emits loadingFinished after body is consumed', async () => {
    const body = '{"result":"success"}';
    const mockResponse = new Response(body, {status: 200});
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await transport.call('Network.enable');
    await globalThis.fetch('https://api.example.com/data');

    // Wait for background body capture
    await new Promise((r) => setTimeout(r, 50));

    const finishEvent = transport.events.find((e) => e.method === 'Network.loadingFinished');
    expect(finishEvent).toBeDefined();
    expect(finishEvent!.params.encodedDataLength).toBe(body.length);
  });

  it('captures response body for getResponseBody', async () => {
    const body = '{"data":"captured"}';
    const mockResponse = new Response(body, {status: 200});
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await transport.call('Network.enable');
    await globalThis.fetch('https://api.example.com/data');
    await new Promise((r) => setTimeout(r, 50));

    // Find the requestId from the event
    const reqEvent = transport.events.find((e) => e.method === 'Network.requestWillBeSent');
    const requestId = reqEvent!.params.requestId as string;

    const result = await transport.call('Network.getResponseBody', {requestId});
    expect(result['body']).toBe(body);
  });

  it('emits loadingFailed on fetch error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await transport.call('Network.enable');

    try {
      await globalThis.fetch('https://api.example.com/fail');
    } catch {
      // Expected
    }

    const failEvent = transport.events.find((e) => e.method === 'Network.loadingFailed');
    expect(failEvent).toBeDefined();
    expect(failEvent!.params.errorText).toBe('Network error');
  });

  it('preserves original fetch behavior', async () => {
    const mockResponse = new Response('original', {status: 200});
    const mockFn = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = mockFn;

    await transport.call('Network.enable');
    const response = await globalThis.fetch('https://example.com');

    // Original fetch was called
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it('restores original fetch on disable', async () => {
    const mockFn = vi.fn().mockResolvedValue(new Response(''));
    globalThis.fetch = mockFn;
    const beforeIntercept = globalThis.fetch;

    await transport.call('Network.enable');
    expect(globalThis.fetch).not.toBe(beforeIntercept);

    await transport.call('Network.disable');
    // After disable, fetch should be the mock (not the interceptor)
    expect(globalThis.fetch).toBe(mockFn);
  });

  it('wraps and restores http.request', async () => {
    // Use createRequire to get the same mutable module the handler uses
    const {createRequire: cr} = await import('node:module');
    const req = cr(import.meta.url);
    const httpMod = req('node:http') as typeof import('node:http');

    handler.restore(); // ensure clean state
    const original = httpMod.request;

    await transport.call('Network.enable');
    const wrapped = httpMod.request;
    expect(wrapped).not.toBe(original);

    await transport.call('Network.disable');
    expect(httpMod.request).toBe(original);
  });
});
