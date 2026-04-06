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
import {V8InspectorProxy} from './V8InspectorProxy';
import {NetworkDomainHandler} from './NetworkDomainHandler';
import {renderCellBufferToImage} from '../utilities/renderCellBufferToImage';
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
  private readonly v8Proxy: V8InspectorProxy;
  private readonly networkHandler: NetworkDomainHandler;

  private readonly window: Window;
  private readonly document: Document;
  private listening = false;
  private screencastInterval: ReturnType<typeof setInterval> | null = null;
  private screencastSessionId = 0;
  private injectedScriptId = 1;
  private readonly getLayoutRoot: (() => {element: unknown; x: number; y: number; width: number; height: number; children: any[]} | null) | null;

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
    getCellBuffer?: () => {cols: number; rows: number; get(x: number, y: number): unknown} | null;
    getLayoutRoot?: () => {element: unknown; x: number; y: number; width: number; height: number; children: any[]} | null;
    options?: DevToolsBridgeOptions;
  }) {
    const port = config.options?.port ?? DEFAULT_CDP_PORT;
    const host = config.options?.host ?? '127.0.0.1';
    const debug = config.options?.debug ?? false;

    this.getLayoutRoot = config.getLayoutRoot ?? null;

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

    // V8 inspector proxy for Debugger, Profiler, HeapProfiler
    this.v8Proxy = new V8InspectorProxy(this.transport);
    this.v8Proxy.connect();

    this.networkHandler = new NetworkDomainHandler(this.transport);

    // Wire the resolve callback from DOM → Runtime
    this.domHandler.resolveNodeToRemoteObject = (node) => {
      return this.objectRegistry.serialize(node) as any;
    };

    // Wire DOM domain to layout lookup
    this.domHandler.layoutLookup = config.layoutLookup ?? null;
    this.domHandler.getLayoutRoot = this.getLayoutRoot;

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
    this.networkHandler.register();

    // DevTools injects a web-vitals measurement script, but it depends on
    // browser lifecycle APIs (navigation entries, visibility-state observers,
    // long-animation-frame entries, etc.) that terminal-dom doesn't implement.
    // Acknowledge the injection without executing the script.
    this.transport.registerMethod('Page.addScriptToEvaluateOnNewDocument', () => {
      return {identifier: String(this.injectedScriptId++)};
    });

    // Page.captureScreenshot renders the cell buffer to a PNG image
    const getCellBuffer = config.getCellBuffer;
    if (getCellBuffer) {
      this.transport.registerMethod('Page.captureScreenshot', () => {
        const buffer = getCellBuffer();
        if (!buffer) return {data: ''};
        try {
          const data = renderCellBufferToImage(buffer as any);
          return {data};
        } catch {
          return {data: ''};
        }
      });

      // Page.startScreencast streams frames to the content preview panel
      this.transport.registerMethod('Page.startScreencast', () => {
        this.stopScreencast();
        const sessionId = ++this.screencastSessionId;
        const fps = 10; // balance between responsiveness and CPU cost
        this.screencastInterval = setInterval(() => {
          if (this.screencastSessionId !== sessionId) return;
          const buffer = getCellBuffer();
          if (!buffer) return;
          try {
            const data = renderCellBufferToImage(buffer as any);
            this.transport.broadcastEvent({
              method: 'Page.screencastFrame',
              params: {
                data,
                metadata: {
                  offsetTop: 0,
                  pageScaleFactor: 1,
                  deviceWidth: (buffer as any).cols * 8,
                  deviceHeight: (buffer as any).rows * 16,
                  scrollOffsetX: 0,
                  scrollOffsetY: 0,
                  timestamp: Date.now() / 1000,
                },
                sessionId,
              },
            });
          } catch {
            // rendering failed, skip frame
          }
        }, 1000 / fps);
        return {};
      });

      this.transport.registerMethod('Page.stopScreencast', () => {
        this.stopScreencast();
        return {};
      });

      this.transport.registerMethod('Page.screencastFrameAck', () => ({}));

      // Input.dispatchMouseEvent — hit-test mouse coordinates against
      // layout boxes for inspect-mode element selection.
      this.transport.registerMethod('Input.dispatchMouseEvent', (params) => {
        const type = params['type'] as string;
        const x = params['x'] as number;
        const y = params['y'] as number;

        if (!this.overlayHandler.isInspectMode) return {};
        if (!getCellBuffer) return {};

        // Convert pixel coordinates to cell coordinates
        const cellX = Math.floor(x / 8);
        const cellY = Math.floor(y / 16);

        // Hit-test: find the deepest element whose layout box contains this cell
        const element = this.hitTestCell(cellX, cellY);
        if (!element) return {};

        const nodeId = this.nodeRegistry.register(element);

        if (type === 'mouseMoved') {
          // Highlight the element under cursor
          this.transport.broadcastEvent({
            method: 'Overlay.nodeHighlightRequested',
            params: {nodeId},
          });
        } else if (type === 'mousePressed') {
          // Select the element in the Elements panel
          this.transport.broadcastEvent({
            method: 'Overlay.inspectNodeRequested',
            params: {backendNodeId: nodeId},
          });
        }

        return {};
      });
    }

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
    this.stopScreencast();
    this.v8Proxy.close();
    this.networkHandler.restore();
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
  private stopScreencast(): void {
    if (this.screencastInterval) {
      clearInterval(this.screencastInterval);
      this.screencastInterval = null;
    }
    this.screencastSessionId++;
  }

  /**
   * Hit-tests a cell coordinate against the layout tree and returns the
   * deepest element whose box contains the cell.
   */
  private hitTestCell(cellX: number, cellY: number): import('@cliui/dom').Element | null {
    if (!this.getLayoutRoot) return null;
    const root = this.getLayoutRoot();
    if (!root) return null;

    let best: any = null;

    const walk = (box: any): void => {
      if (
        cellX >= box.x &&
        cellX < box.x + box.width &&
        cellY >= box.y &&
        cellY < box.y + box.height
      ) {
        best = box.element;
        // Continue into children — deeper match wins
        if (box.children) {
          for (const child of box.children) {
            walk(child);
          }
        }
      }
    };

    walk(root);
    return best;
  }

  private onClientConnect(): void {
    this.mutationBridge.enable();
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
