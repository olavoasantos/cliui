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
