import type {CDPTransport} from './CDPTransport';

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

    return {};
  }

  private disable(): Record<string, unknown> {
    if (!this.enabled) return {};
    this.enabled = false;

    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
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
}
