import {openSync, writeSync} from 'node:fs';
import {CDPTransport} from './CDPTransport';
import {NodeRegistry} from './NodeRegistry';
import {ObjectRegistry} from './ObjectRegistry';
import {DOMDomainHandler} from './DOMDomainHandler';
import {DOMMutationBridge} from './DOMMutationBridge';
import {CSSDomainHandler} from './CSSDomainHandler';
import {RuntimeDomainHandler} from './RuntimeDomainHandler';
import {LogDomainHandler} from './LogDomainHandler';
import {OverlayDomainHandler} from './OverlayDomainHandler';
import {PerformanceDomainHandler} from './PerformanceDomainHandler';
import {DEFAULT_CDP_PORT} from '../constants';

import type {WebSocket} from 'ws';
import type {DevToolsBridgeOptions} from '../types';
import type {Window, Document, Element} from '@cliui/dom';

/**
 * Interface for the style engine used by the CSS domain.
 */
interface StyleEngineAccessor {
  getComputedStyle(element: Element): Map<string, string>;
}

/**
 * Interface for selector matching used by the CSS domain.
 */
interface SelectorMatcherAccessor {
  match(
    rules: Array<{selectors: unknown[][]; declarations: Array<{property: string; value: string}>}>,
    element: Element,
  ): Array<{
    declaration: {property: string; value: string};
    specificity: [number, number, number];
    order: number;
  }>;
}

/**
 * Interface for CSS parsing used by the CSS domain.
 */
interface CSSParserAccessor {
  parse(css: string): {
    rules: Array<{selectors: unknown[][]; declarations: Array<{property: string; value: string}>}>;
  };
}

/**
 * Top-level orchestrator that wires all CDP domain handlers together
 * and provides the public API for enabling Chrome DevTools debugging.
 *
 * Accepts a terminal's window/document, style engine, and optional
 * layout lookup, then coordinates domain initialization, lifecycle,
 * and cleanup.
 *
 * @example
 * ```ts
 * import { DevToolsBridge } from '@cliui/devtools';
 *
 * const bridge = new DevToolsBridge({
 *   window: terminal.window,
 *   document: terminal.document,
 *   styleEngine,
 *   selectorMatcher,
 *   cssParser,
 * });
 * await bridge.listen(9222);
 * ```
 */
export class DevToolsBridge {
  private readonly transport: CDPTransport;
  private readonly nodeRegistry: NodeRegistry;
  private readonly objectRegistry: ObjectRegistry;
  private readonly domHandler: DOMDomainHandler;
  private readonly mutationBridge: DOMMutationBridge;
  private readonly cssHandler: CSSDomainHandler;
  private readonly runtimeHandler: RuntimeDomainHandler;
  private readonly logHandler: LogDomainHandler;
  private readonly overlayHandler: OverlayDomainHandler;
  private readonly performanceHandler: PerformanceDomainHandler;

  private readonly window: Window;
  private readonly document: Document;
  private listening = false;
  private vitalsInterval: ReturnType<typeof setInterval> | null = null;
  private injectedScriptId = 1;

  /**
   * Creates a new DevTools bridge.
   *
   * @param config - Bridge configuration providing terminal internals.
   */
  constructor(config: {
    window: Window;
    document: Document;
    styleEngine?: StyleEngineAccessor | null;
    selectorMatcher: SelectorMatcherAccessor;
    cssParser: CSSParserAccessor;
    terminalInstance?: unknown;
    layoutLookup?: (element: Element) => {
      x: number;
      y: number;
      width: number;
      height: number;
      contentX: number;
      contentY: number;
      contentWidth: number;
      contentHeight: number;
    } | null;
    cellHighlighter?: (
      x: number,
      y: number,
      w: number,
      h: number,
      color: {r: number; g: number; b: number; a: number},
    ) => void;
    options?: DevToolsBridgeOptions;
  }) {
    const port = config.options?.port ?? DEFAULT_CDP_PORT;
    const host = config.options?.host ?? '127.0.0.1';
    const debug = config.options?.debug ?? false;

    this.window = config.window;
    this.document = config.document;

    // Create transport
    this.transport = new CDPTransport({port, host});
    this.transport.debug = debug;

    // Create registries
    this.nodeRegistry = new NodeRegistry();
    this.objectRegistry = new ObjectRegistry();

    // Create domain handlers
    this.domHandler = new DOMDomainHandler(this.transport, this.nodeRegistry, this.document);

    this.mutationBridge = new DOMMutationBridge(this.transport, this.nodeRegistry);

    this.cssHandler = new CSSDomainHandler(
      this.transport,
      this.nodeRegistry,
      this.document,
      config.styleEngine ?? null,
      config.selectorMatcher as any,
      config.cssParser as any,
    );

    this.runtimeHandler = new RuntimeDomainHandler(
      this.transport,
      this.objectRegistry,
      this.window,
      this.document,
      this.domHandler,
      config.terminalInstance ?? null,
    );

    this.logHandler = new LogDomainHandler(this.transport, this.runtimeHandler);

    this.overlayHandler = new OverlayDomainHandler(
      this.transport,
      this.nodeRegistry,
      config.layoutLookup ?? (() => null),
      config.cellHighlighter ?? (() => {}),
    );

    this.performanceHandler = new PerformanceDomainHandler(
      this.transport,
      this.window.performance,
      (this.window as any).PerformanceObserver ?? ((globalThis as any).PerformanceObserver as any),
    );

    // Wire the resolve callback from DOM → Runtime
    this.domHandler.resolveNodeToRemoteObject = (node) => {
      return this.objectRegistry.serialize(node) as any;
    };

    // Wire DOM domain to layout lookup
    this.domHandler.layoutLookup = config.layoutLookup ?? null;

    // Wire connection/disconnection lifecycle
    this.transport.onConnect((_socket: WebSocket) => {
      this.onClientConnect();
    });

    this.transport.onDisconnect((_socket: WebSocket) => {
      this.onClientDisconnect();
    });

    // Auto-install mutation bridge hooks by chaining onto existing window hooks
    this.mutationBridge.install(this.window);
    this.domHandler.register();
    this.cssHandler.register();
    this.runtimeHandler.register();
    this.logHandler.register();
    this.overlayHandler.register();
    this.performanceHandler.register();

    // Override addScriptToEvaluateOnNewDocument to actually execute the
    // injected script.  DevTools injects a web-vitals library that calls
    // __chromium_devtools_metrics_reporter — if we run it, the metric
    // cards (LCP, CLS, INP) on the Performance tab populate with real data.
    this.transport.registerMethod('Page.addScriptToEvaluateOnNewDocument', (params) => {
      const source = (params['source'] as string) ?? '';
      if (source) {
        // Save the script for debugging
        if (source.includes('__chromium_devtools_metrics_reporter')) {
          try { writeSync(openSync('cdp-vitals-script.js', 'w'), source); } catch {}
        }
        this.executeInjectedScript(source);
      }
      return {identifier: String(this.injectedScriptId++)};
    });

    // Runtime.addBinding creates a function on the window that, when called,
    // emits a Runtime.bindingCalled event.  DevTools' web-vitals script
    // needs this to report metrics back.
    this.transport.registerMethod('Runtime.addBinding', (params) => {
      const name = params['name'] as string;
      if (name) {
        (this.window as any)[name] = (payload: string) => {
          this.transport.broadcastEvent({
            method: 'Runtime.bindingCalled',
            params: {name, payload, executionContextId: 1},
          });
        };
      }
      return {};
    });
  }

  /**
   * Starts the CDP server and begins accepting DevTools connections.
   *
   * @param port - Optional port override.
   * @returns A promise that resolves once the server is listening.
   */
  async listen(port?: number): Promise<void> {
    if (port !== undefined) {
      // Recreate transport with new port — but since transport is created
      // in constructor, we just start listening
    }

    try {
      await this.transport.listen();
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        const p = port ?? DEFAULT_CDP_PORT;
        console.error(
          `DevTools: port ${p} is already in use. ` +
            `A previous process may still be running. ` +
            `Kill it or use a different port.`,
        );
      }
      throw err;
    }

    this.listening = true;

    const addr = this.transport.server.server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : (port ?? DEFAULT_CDP_PORT);
    const host = typeof addr === 'object' && addr && 'address' in addr ? addr.address : '127.0.0.1';

    // Log to stderr so it doesn't pollute the terminal's alt screen stdout
    process.stderr.write(`DevTools listening on ws://${host}:${actualPort}\n`);
    process.stderr.write(
      `  Open: devtools://devtools/bundled/inspector.html?ws=${host}:${actualPort}/devtools/terminal-dom\n`,
    );
    if (this.transport.debug) {
      process.stderr.write('  CDP debug log: cdp-debug.log\n');
    }
  }

  /**
   * Shuts down the bridge, disconnects all clients, and cleans up.
   *
   * @returns A promise that resolves once shutdown is complete.
   */
  async close(): Promise<void> {
    if (this.vitalsInterval) {
      clearInterval(this.vitalsInterval);
      this.vitalsInterval = null;
    }
    this.logHandler.restore();
    this.mutationBridge.disable();
    this.nodeRegistry.clear();
    this.objectRegistry.clear();

    if (this.listening) {
      await this.transport.close();
      this.listening = false;
    }
  }

  /** Returns whether the bridge is currently listening. */
  get isListening(): boolean {
    return this.listening;
  }

  /** Returns the node registry (for testing and integration). */
  get nodes(): NodeRegistry {
    return this.nodeRegistry;
  }

  /** Returns the object registry (for testing and integration). */
  get objects(): ObjectRegistry {
    return this.objectRegistry;
  }

  /** Returns the DOM domain handler (for integration). */
  get dom(): DOMDomainHandler {
    return this.domHandler;
  }

  /** Returns the overlay domain handler (for integration). */
  get overlay(): OverlayDomainHandler {
    return this.overlayHandler;
  }


  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * Called when a DevTools client connects.
   *
   * Initializes all domains with the terminal's current state.
   */
  private onClientConnect(): void {
    this.mutationBridge.enable();

    // Emit vitals immediately and then periodically
    this.emitTerminalVitals();
    if (this.vitalsInterval) clearInterval(this.vitalsInterval);
    this.vitalsInterval = setInterval(() => {
      if (this.transport.clients.size > 0) {
        this.emitTerminalVitals();
      }
    }, 3000);
  }

  /**
   * Reads LCP, FCP, and INP from window.performance and emits them
   * as `Runtime.bindingCalled` events using the web-vitals reporter
   * binding that DevTools registered during startup.
   */
  private emitTerminalVitals(): void {
    const perf = this.window.performance;
    const entries = perf.getEntries();

    // LCP
    const lcp = entries.find((e) => e.name === 'largest-contentful-paint');
    if (lcp) {
      this.emitVitalsMetric('LCP', (lcp as any).renderTime ?? lcp.startTime);
    }

    // INP — use the worst event timing duration
    const eventTimings = entries.filter((e) => e.entryType === 'event');
    if (eventTimings.length > 0) {
      const worst = eventTimings.reduce((max, e) => (e.duration > max.duration ? e : max));
      this.emitVitalsMetric('INP', worst.duration);
    }

    // CLS — terminal doesn't have layout shifts, report 0
    this.emitVitalsMetric('CLS', 0);
  }

  /**
   * Emits a single web-vitals metric via the DevTools binding.
   */
  private emitVitalsMetric(name: string, value: number): void {
    const rating = name === 'CLS'
      ? (value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor')
      : name === 'LCP'
        ? (value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor')
        : (value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor');

    this.transport.broadcastEvent({
      method: 'Runtime.bindingCalled',
      params: {
        name: '__chromium_devtools_metrics_reporter',
        payload: JSON.stringify({name, value, rating}),
        executionContextId: 1,
      },
    });
  }

  /**
   * Executes a script injected by DevTools via addScriptToEvaluateOnNewDocument.
   *
   * The script runs with access to the terminal's window globals so that
   * libraries like web-vitals can use PerformanceObserver, performance,
   * and registered bindings.
   */
  private executeInjectedScript(source: string): void {
    try {
      const win = this.window as any;
      const doc = win.document;
      const perf = win.performance;

      // Polyfill APIs the web-vitals script needs that @cliui/dom doesn't provide
      if (!doc.visibilityState) doc.visibilityState = 'visible';
      if (!doc.readyState) doc.readyState = 'complete';
      if (!doc.prerendering) doc.prerendering = false;
      if (!doc.wasDiscarded) doc.wasDiscarded = false;
      if (!win.requestAnimationFrame) {
        win.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 16);
      }
      if (!win.requestIdleCallback) {
        win.requestIdleCallback = (cb: () => void) => setTimeout(cb, 0);
      }

      // PerformanceObserver.supportedEntryTypes is critical —
      // the web-vitals script checks it before creating ANY observer.
      const PO = win.PerformanceObserver ?? (globalThis as any).PerformanceObserver;
      if (PO && !PO.supportedEntryTypes) {
        PO.supportedEntryTypes = [
          'mark', 'measure', 'paint', 'event', 'first-input',
          'largest-contentful-paint', 'layout-shift',
        ];
      }

      // performance.getEntriesByType('navigation') needs to return
      // at least one entry for TTFB/LCP attribution
      const origGetByType = perf.getEntriesByType?.bind(perf);
      perf.getEntriesByType = (type: string) => {
        if (type === 'navigation') {
          return [{
            entryType: 'navigation',
            name: 'terminal://localhost',
            startTime: 0,
            duration: 0,
            responseStart: 1,
            activationStart: 0,
            domInteractive: 1,
            domContentLoadedEventStart: 1,
            domComplete: 1,
            type: 'navigate',
          }];
        }
        if (type === 'visibility-state') return [];
        if (type === 'resource') return [];
        return origGetByType?.(type) ?? [];
      };

      // The web-vitals script calls observe({type: 'paint', buffered: true})
      // without the {performance} property our PerformanceObserver requires.
      // Wrap PO so that observe() auto-injects the performance instance.
      const wrappedPO = function(this: any, callback: any) {
        PO.call(this, callback);
      } as any;
      wrappedPO.prototype = Object.create(PO.prototype);
      wrappedPO.prototype.constructor = wrappedPO;
      wrappedPO.supportedEntryTypes = PO.supportedEntryTypes;
      const origObserve = PO.prototype.observe;
      wrappedPO.prototype.observe = function(options: any) {
        if (!options.performance) options.performance = perf;
        return origObserve.call(this, options);
      };

      const fn = new Function(
        'window', 'document', 'performance', 'PerformanceObserver',
        'navigator', 'location', 'self',
        'addEventListener', 'removeEventListener',
        source,
      );
      fn(
        win,
        doc,
        perf,
        wrappedPO,
        win.navigator ?? {userAgent: 'TerminalDOM'},
        win.location ?? {href: 'terminal://localhost'},
        win,
        win.addEventListener?.bind(win) ?? (() => {}),
        win.removeEventListener?.bind(win) ?? (() => {}),
      );
    } catch {
      // Script may use APIs we don't implement — fail silently
    }
  }

  /**
   * Called when a DevTools client disconnects.
   *
   * Cleans up registries to prevent memory leaks, but keeps the
   * server running for reconnection.
   */
  private onClientDisconnect(): void {
    if (this.transport.clients.size === 0) {
      this.mutationBridge.disable();
      this.objectRegistry.clear();
      // Keep node registry — DevTools may reconnect and need stable IDs
    }
  }
}
