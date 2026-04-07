import type {CDPTransport} from './CDPTransport';
import type {ClientRequest, IncomingMessage} from 'node:http';

// Use createRequire so we get mutable module references.
// ESM import creates read-only namespace objects that can't be patched.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const http = require('node:http') as typeof import('node:http');
const https = require('node:https') as typeof import('node:https');

/**
 * CDP Network domain handler that intercepts `globalThis.fetch` to
 * emit request/response events visible in the DevTools Network tab.
 *
 * Interception is non-destructive — original fetch behavior is
 * preserved (tee pattern, same as Log domain for console).
 */
export class NetworkDomainHandler {
  private readonly transport: CDPTransport;
  private enabled = false;
  private originalFetch: typeof globalThis.fetch | null = null;
  private originalHttpRequest: typeof http.request | null = null;
  private originalHttpsRequest: typeof https.request | null = null;
  private nextRequestId = 1;

  /** Maps requestId → response body for `Network.getResponseBody`. */
  private readonly responseBodies = new Map<string, {body: string; base64Encoded: boolean}>();

  constructor(transport: CDPTransport) {
    this.transport = transport;
  }

  /** Registers all Network domain method handlers. */
  register(): void {
    this.transport.registerMethod('Network.enable', () => this.enable());
    this.transport.registerMethod('Network.disable', () => this.disable());
    this.transport.registerMethod('Network.getResponseBody', (params) =>
      this.getResponseBody(params),
    );
  }

  /** Whether fetch interception is currently active. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Restores original fetch. Called during bridge shutdown. */
  restore(): void {
    this.disable();
  }

  private enable(): Record<string, unknown> {
    if (this.enabled) return {};
    this.enabled = true;

    this.originalFetch = globalThis.fetch;

    globalThis.fetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const requestId = String(this.nextRequestId++);
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.href : (input as any).url;
      const method = init?.method ?? 'GET';
      const timestamp = Date.now() / 1000;

      // Emit requestWillBeSent
      const headers: Record<string, string> = {};
      if (init?.headers) {
        const h = new Headers(init.headers as Record<string, string>);
        h.forEach((v, k) => {
          headers[k] = v;
        });
      }
      this.transport.broadcastEvent({
        method: 'Network.requestWillBeSent',
        params: {
          requestId,
          loaderId: '1',
          documentURL: 'terminal://localhost',
          request: {
            url,
            method,
            headers,
            initialPriority: 'High',
            referrerPolicy: 'no-referrer',
          },
          timestamp,
          wallTime: timestamp,
          initiator: {type: 'script'},
          type: 'Fetch',
        },
      });

      try {
        const response = await this.originalFetch!(input, init);

        // Clone so we can read the body without consuming it
        const cloned = response.clone();

        // Emit responseReceived
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => {
          responseHeaders[k] = v;
        });

        this.transport.broadcastEvent({
          method: 'Network.responseReceived',
          params: {
            requestId,
            loaderId: '1',
            timestamp: Date.now() / 1000,
            type: 'Fetch',
            response: {
              url,
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              mimeType: response.headers.get('content-type') ?? 'text/plain',
              connectionReused: false,
              connectionId: 0,
              encodedDataLength: 0,
              fromDiskCache: false,
              fromServiceWorker: false,
            },
          },
        });

        // Capture response body in background
        cloned
          .text()
          .then((text) => {
            this.responseBodies.set(requestId, {body: text, base64Encoded: false});

            this.transport.broadcastEvent({
              method: 'Network.loadingFinished',
              params: {
                requestId,
                timestamp: Date.now() / 1000,
                encodedDataLength: text.length,
              },
            });
          })
          .catch(() => {
            this.transport.broadcastEvent({
              method: 'Network.loadingFinished',
              params: {
                requestId,
                timestamp: Date.now() / 1000,
                encodedDataLength: 0,
              },
            });
          });

        return response;
      } catch (err) {
        this.transport.broadcastEvent({
          method: 'Network.loadingFailed',
          params: {
            requestId,
            timestamp: Date.now() / 1000,
            type: 'Fetch',
            errorText: (err as Error).message,
          },
        });
        throw err;
      }
    };

    // Intercept http.request and https.request
    this.originalHttpRequest = http.request;
    this.originalHttpsRequest = https.request;

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- inner function rebinds `this` for http.request proxy
    const self = this;
    const wrapRequest = (original: typeof http.request, protocol: string): typeof http.request => {
      return function interceptedRequest(
        this: unknown,
        ...args: Parameters<typeof http.request>
      ): ClientRequest {
        const req = original.apply(this, args) as ClientRequest;
        self.instrumentClientRequest(req, protocol);
        return req;
      } as typeof http.request;
    };

    http.request = wrapRequest(this.originalHttpRequest, 'http:');
    https.request = wrapRequest(this.originalHttpsRequest, 'https:');

    return {};
  }

  private disable(): Record<string, unknown> {
    if (!this.enabled) return {};
    this.enabled = false;

    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    if (this.originalHttpRequest) {
      http.request = this.originalHttpRequest;
      this.originalHttpRequest = null;
    }
    if (this.originalHttpsRequest) {
      https.request = this.originalHttpsRequest;
      this.originalHttpsRequest = null;
    }
    this.responseBodies.clear();

    return {};
  }

  private getResponseBody(params: Record<string, unknown>): Record<string, unknown> {
    const requestId = params['requestId'] as string;
    const entry = this.responseBodies.get(requestId);
    if (entry) {
      return {body: entry.body, base64Encoded: entry.base64Encoded};
    }
    return {body: '', base64Encoded: false};
  }

  /**
   * Instruments a `ClientRequest` from `http.request` / `https.request`
   * to emit CDP Network events.
   */
  private instrumentClientRequest(req: ClientRequest, protocol: string): void {
    const requestId = String(this.nextRequestId++);
    const timestamp = Date.now() / 1000;
    const url = `${protocol}//${req.host ?? 'localhost'}${req.path ?? '/'}`;
    const method = req.method ?? 'GET';

    const reqHeaders: Record<string, string> = {};
    const rawHeaders = req.getHeaders();
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (v !== undefined) reqHeaders[k] = String(v);
    }

    this.transport.broadcastEvent({
      method: 'Network.requestWillBeSent',
      params: {
        requestId,
        loaderId: '1',
        documentURL: 'terminal://localhost',
        request: {
          url,
          method,
          headers: reqHeaders,
          initialPriority: 'High',
          referrerPolicy: 'no-referrer',
        },
        timestamp,
        wallTime: timestamp,
        initiator: {type: 'script'},
        type: 'XHR',
      },
    });

    req.on('response', (res: IncomingMessage) => {
      const resHeaders: Record<string, string> = {};
      if (res.headers) {
        for (const [k, v] of Object.entries(res.headers)) {
          if (v !== undefined) resHeaders[k] = Array.isArray(v) ? v.join(', ') : v;
        }
      }

      this.transport.broadcastEvent({
        method: 'Network.responseReceived',
        params: {
          requestId,
          loaderId: '1',
          timestamp: Date.now() / 1000,
          type: 'XHR',
          response: {
            url,
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            headers: resHeaders,
            mimeType: res.headers['content-type'] ?? 'text/plain',
            connectionReused: false,
            connectionId: 0,
            encodedDataLength: 0,
            fromDiskCache: false,
            fromServiceWorker: false,
          },
        },
      });

      // Capture body
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        this.responseBodies.set(requestId, {body, base64Encoded: false});

        this.transport.broadcastEvent({
          method: 'Network.loadingFinished',
          params: {
            requestId,
            timestamp: Date.now() / 1000,
            encodedDataLength: body.length,
          },
        });
      });
    });

    req.on('error', (err: Error) => {
      this.transport.broadcastEvent({
        method: 'Network.loadingFailed',
        params: {
          requestId,
          timestamp: Date.now() / 1000,
          type: 'XHR',
          errorText: err.message,
        },
      });
    });
  }
}
