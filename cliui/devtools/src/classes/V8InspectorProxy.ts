import {Session} from 'node:inspector';

import type {CDPTransport} from './CDPTransport';
import type {WebSocket} from 'ws';

/**
 * CDP domains that are proxied to the V8 inspector instead of being
 * handled locally.  Every method under these domains is forwarded.
 */
const PROXIED_DOMAINS = new Set([
  'Debugger',
  'Profiler',
  'HeapProfiler',
]);

/**
 * Specific methods within proxied domains that we handle locally
 * instead of forwarding to V8 (because V8's context is different
 * from our terminal DOM context).
 */
const LOCAL_OVERRIDES: Set<string> = new Set([
  // Runtime.evaluate uses our terminal scope ($0, window, document)
  // so it must NOT be proxied.  But Runtime is not in PROXIED_DOMAINS
  // anyway — this set is for future per-method overrides if needed.
]);

/**
 * Proxies Debugger, Profiler, and HeapProfiler CDP commands to the
 * V8 inspector running in the current Node.js process.
 *
 * This unlocks the Sources tab (breakpoints, stepping, script sources),
 * real CPU profiling in the Performance tab (flame charts with actual
 * call stacks), and heap snapshots in the Memory tab — all without
 * reimplementing any V8 internals.
 *
 * Events from V8 (e.g. `Debugger.scriptParsed`, `Debugger.paused`,
 * `HeapProfiler.addHeapSnapshotChunk`) are forwarded to DevTools
 * via the CDP transport.
 */
export class V8InspectorProxy {
  private readonly transport: CDPTransport;
  private session: Session | null = null;
  private connected = false;

  /**
   * Maps pending V8 request callback IDs to the CDP command `id`
   * and the originating WebSocket so responses go to the right client.
   */
  private readonly pending = new Map<number, {cdpId: number; socket: WebSocket}>();

  constructor(transport: CDPTransport) {
    this.transport = transport;
  }

  /**
   * Connects to the V8 inspector and registers proxy handlers on the
   * transport for all proxied domains.
   *
   * If `node:inspector` is unavailable or the session fails to connect,
   * the existing stub handlers remain and DevTools panels show empty
   * state instead of crashing.
   */
  connect(): boolean {
    try {
      this.session = new Session();
      this.session.connect();
      this.connected = true;

      // Forward V8 events to DevTools
      this.session.on('inspectorNotification', (message) => {
        if (message.method) {
          this.transport.broadcastEvent({
            method: message.method,
            params: (message.params as Record<string, unknown>) ?? {},
          });
        }
      });

      // Register proxy handlers that replace the stubs
      this.registerProxyHandlers();

      return true;
    } catch {
      this.connected = false;
      this.session = null;
      return false;
    }
  }

  /** Returns whether the V8 session is connected. */
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnects the V8 inspector session.
   */
  close(): void {
    if (this.session && this.connected) {
      try {
        this.session.disconnect();
      } catch {
        // Session may already be disconnected
      }
    }
    this.connected = false;
    this.session = null;
    this.pending.clear();
  }

  /**
   * Sends a command to V8 and returns the result as a Promise.
   *
   * Used internally and exposed for direct V8 commands that bypass
   * the CDPTransport routing (e.g., during bridge shutdown).
   */
  post(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.session || !this.connected) {
        reject(new Error('V8 inspector session not connected'));
        return;
      }
      const callback = (err: Error | null, result?: object) => {
        if (err) {
          reject(err);
        } else {
          resolve((result as Record<string, unknown>) ?? {});
        }
      };
      if (params && Object.keys(params).length > 0) {
        (this.session as any).post(method, params, callback);
      } else {
        (this.session as any).post(method, callback);
      }
    });
  }

  /**
   * Registers a proxy handler for every method in the proxied domains.
   *
   * Instead of registering individual methods, we use a catch-all
   * pattern: the CDPTransport calls our handler for any method that
   * starts with a proxied domain prefix.
   */
  private registerProxyHandlers(): void {
    for (const domain of PROXIED_DOMAINS) {
      this.transport.registerDomainProxy(domain, (method, params, socket, cdpId) => {
        return this.proxyCommand(method, params, socket, cdpId);
      });
    }
  }

  /**
   * Forwards a single CDP command to V8 and relays the response.
   */
  private proxyCommand(
    method: string,
    params: Record<string, unknown>,
    _socket: WebSocket,
    _cdpId: number,
  ): Promise<Record<string, unknown>> {
    if (LOCAL_OVERRIDES.has(method)) {
      return Promise.resolve({});
    }

    return this.post(method, params);
  }
}
