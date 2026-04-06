import {openSync, writeSync} from 'node:fs';
import {DEFAULT_CDP_PORT, FRAME_ID} from '../constants';
import {WebSocketServer} from './WebSocketServer';

import type {IncomingMessage, ServerResponse} from 'node:http';
import type {WebSocket} from 'ws';
import type {
  CDPCommand,
  CDPMethodHandler,
  CDPResponse,
  CDPEvent,
  DomainProxyHandler,
  TargetDescriptor,
} from '../types';

/**
 * CDP transport layer: HTTP discovery endpoint and WebSocket message routing.
 *
 * Chrome DevTools first queries `/json/list` to discover debuggable targets,
 * then opens a WebSocket to the target's debug URL.  This class handles both
 * the HTTP discovery responses and the WebSocket command dispatch.
 *
 * The target descriptor's `type` **must** be `"page"` — Chrome shows the
 * Node.js inspector UI (hiding Elements/Styles panels) if it sees `"node"`.
 */
export class CDPTransport {
  private readonly wsServer: WebSocketServer;
  private readonly targetId: string;
  private readonly port: number;
  private readonly host: string;
  private readonly handlers = new Map<string, CDPMethodHandler>();
  private readonly domainProxies = new Map<string, DomainProxyHandler>();
  private readonly clientSockets = new Set<WebSocket>();

  /** Called when a DevTools client connects. */
  private onClientConnect: ((socket: WebSocket) => void) | null = null;

  /** Called when a DevTools client disconnects. */
  private onClientDisconnect: ((socket: WebSocket) => void) | null = null;

  /**
   * Creates a new CDP transport.
   *
   * @param options - Transport configuration.
   */
  constructor(options: {port?: number; host?: string; targetId?: string} = {}) {
    this.port = options.port ?? DEFAULT_CDP_PORT;
    this.host = options.host ?? '127.0.0.1';
    this.targetId = options.targetId ?? 'terminal-dom';

    this.wsServer = new WebSocketServer({port: this.port, host: this.host});

    // Attach HTTP handler for discovery endpoints
    this.wsServer.server.on('request', (req: IncomingMessage, res: ServerResponse) => {
      this.handleHttpRequest(req, res);
    });

    // Wire WebSocket events
    this.wsServer.onconnection((socket: WebSocket) => {
      this.clientSockets.add(socket);
      this.onClientConnect?.(socket);
    });

    this.wsServer.onclose((socket: WebSocket) => {
      this.clientSockets.delete(socket);
      this.onClientDisconnect?.(socket);
    });

    this.wsServer.onmessage((socket: WebSocket, data: string) => {
      this.handleMessage(socket, data);
    });

    // Register startup handshake stubs
    this.registerStartupStubs();
  }

  /**
   * Registers a callback for when a DevTools client connects.
   *
   * @param callback - Connection handler.
   */
  onConnect(callback: (socket: WebSocket) => void): void {
    this.onClientConnect = callback;
  }

  /**
   * Registers a callback for when a DevTools client disconnects.
   *
   * @param callback - Disconnection handler.
   */
  onDisconnect(callback: (socket: WebSocket) => void): void {
    this.onClientDisconnect = callback;
  }

  /**
   * Registers a handler for a CDP domain method.
   *
   * @param method  - Domain-qualified method name (e.g. `"DOM.getDocument"`).
   * @param handler - Handler function.
   */
  registerMethod(method: string, handler: CDPMethodHandler): void {
    this.handlers.set(method, handler);
  }

  /**
   * Registers a proxy handler for an entire CDP domain.
   *
   * Any method starting with `domain.` that doesn't have a specific
   * handler registered via {@link registerMethod} will be forwarded
   * to the proxy handler.
   */
  registerDomainProxy(domain: string, handler: DomainProxyHandler): void {
    this.domainProxies.set(domain, handler);
  }

  /**
   * Sends a CDP response to a specific client.
   *
   * @param socket   - Target WebSocket connection.
   * @param response - CDP response object.
   */
  sendResponse(socket: WebSocket, response: CDPResponse): void {
    this.wsServer.send(socket, JSON.stringify(response));
  }

  /**
   * Sends a CDP event to a specific client.
   *
   * @param socket - Target WebSocket connection.
   * @param event  - CDP event object.
   */
  sendEvent(socket: WebSocket, event: CDPEvent): void {
    this.wsServer.send(socket, JSON.stringify(event));
  }

  /**
   * Broadcasts a CDP event to all connected DevTools clients.
   *
   * @param event - CDP event object.
   */
  broadcastEvent(event: CDPEvent): void {
    this.debugLog(`⇐ EVENT ${event.method} ${JSON.stringify(event.params).slice(0, 200)}`);
    const data = JSON.stringify(event);
    for (const socket of this.clientSockets) {
      this.wsServer.send(socket, data);
    }
  }

  /** Returns the set of currently connected DevTools client sockets. */
  get clients(): ReadonlySet<WebSocket> {
    return this.clientSockets;
  }

  /**
   * Starts the transport server.
   *
   * @returns A promise that resolves once the server is listening.
   */
  async listen(): Promise<void> {
    await this.wsServer.listen();
  }

  /**
   * Shuts down the transport and disconnects all clients.
   *
   * @returns A promise that resolves once shutdown is complete.
   */
  async close(): Promise<void> {
    this.clientSockets.clear();
    await this.wsServer.close();
  }

  /** Returns the underlying WebSocket server. */
  get server(): WebSocketServer {
    return this.wsServer;
  }

  /**
   * Builds the target descriptor for `/json/list`.
   */
  private getTargetDescriptor(): TargetDescriptor {
    return {
      description: 'Terminal DOM application',
      devtoolsFrontendUrl: `devtools://devtools/bundled/inspector.html?ws=${this.host}:${this.port}/devtools/${this.targetId}`,
      id: this.targetId,
      title: 'Terminal DOM',
      type: 'page',
      url: 'terminal://localhost',
      webSocketDebuggerUrl: `ws://${this.host}:${this.port}/devtools/${this.targetId}`,
    };
  }

  /**
   * Handles HTTP discovery requests: `/json`, `/json/list`, `/json/version`.
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '';

    if (url === '/json' || url === '/json/list') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify([this.getTargetDescriptor()]));
      return;
    }

    if (url === '/json/version') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(
        JSON.stringify({
          Browser: 'Terminal DOM/1.0',
          'Protocol-Version': '1.3',
          'V8-Version': process.versions.v8 ?? '0.0',
          'User-Agent': 'Terminal DOM',
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  }

  /**
   * When `true`, all CDP messages and responses are logged.
   * Output goes to `cdp-debug.log` in the current working directory
   * to avoid garbling the terminal UI.
   */
  debug = false;

  /** File descriptor for the debug log, opened lazily. */
  private debugFd: number | null = null;

  /** Writes a line to the debug log file. */
  private debugLog(line: string): void {
    if (!this.debug) return;
    if (this.debugFd === null) {
      this.debugFd = openSync('cdp-debug.log', 'w');
    }
    writeSync(this.debugFd, line + '\n');
  }

  /**
   * Dispatches an incoming WebSocket message to the appropriate domain handler.
   */
  private async handleMessage(socket: WebSocket, data: string): Promise<void> {
    let command: CDPCommand;
    try {
      command = JSON.parse(data) as CDPCommand;
    } catch {
      return; // Silently ignore malformed messages
    }

    if (this.debug) {
      this.debugLog(`← ${command.method} ${JSON.stringify(command.params ?? {}).slice(0, 200)}`);
    }

    const handler = this.handlers.get(command.method);
    if (handler) {
      try {
        const result = await handler(command.params ?? {});
        const response = {id: command.id, result: result ?? {}};
        if (this.debug) {
          this.debugLog(`→ ${command.method} ${JSON.stringify(response.result).slice(0, 200)}`);
        }
        this.sendResponse(socket, response);
      } catch (err) {
        if (this.debug) {
          this.debugLog(`✗ ${command.method} ${(err as Error).message}`);
        }
        this.sendResponse(socket, {
          id: command.id,
          result: {error: (err as Error).message},
        });
      }
      return;
    }

    // Check for a domain-level proxy (e.g. Debugger.*, Profiler.*)
    const dotIdx = command.method.indexOf('.');
    if (dotIdx > 0) {
      const domain = command.method.slice(0, dotIdx);
      const proxy = this.domainProxies.get(domain);
      if (proxy) {
        try {
          const result = await proxy(command.method, command.params ?? {}, socket, command.id);
          const response = {id: command.id, result: result ?? {}};
          if (this.debug) {
            this.debugLog(`→ ${command.method} (v8) ${JSON.stringify(response.result).slice(0, 200)}`);
          }
          this.sendResponse(socket, response);
        } catch (err) {
          if (this.debug) {
            this.debugLog(`✗ ${command.method} (v8) ${(err as Error).message}`);
          }
          this.sendResponse(socket, {
            id: command.id,
            result: {error: (err as Error).message},
          });
        }
        return;
      }
    }

    if (this.debug) {
      this.debugLog(`? ${command.method} (unhandled)`);
    }
    // Unknown methods get an empty response to satisfy DevTools
    this.sendResponse(socket, {
      id: command.id,
      result: {},
    });
  }

  /**
   * Registers stub handlers for startup handshake methods.
   *
   * DevTools sends these during initialization and expects acknowledgment.
   */
  private registerStartupStubs(): void {
    const noop: CDPMethodHandler = () => ({});

    // Page domain stubs
    this.registerMethod('Page.enable', noop);
    this.registerMethod('Page.canScreencast', () => ({result: false}));
    this.registerMethod('Page.getResourceTree', () => ({
      frameTree: {
        frame: {
          id: FRAME_ID,
          loaderId: '1',
          url: 'terminal://localhost',
          domainAndRegistry: '',
          securityOrigin: 'terminal://localhost',
          mimeType: 'text/html',
        },
        resources: [],
      },
    }));
    this.registerMethod('Page.getFrameTree', () => ({
      frameTree: {
        frame: {
          id: FRAME_ID,
          loaderId: '1',
          url: 'terminal://localhost',
          domainAndRegistry: '',
          securityOrigin: 'terminal://localhost',
          mimeType: 'text/html',
        },
      },
    }));

    // Inspector domain stubs
    this.registerMethod('Inspector.enable', noop);

    // Network domain stubs
    this.registerMethod('Network.enable', noop);
    this.registerMethod('Network.setCacheDisabled', noop);
    this.registerMethod('Network.setAttachDebugStack', noop);

    // Target domain stubs
    this.registerMethod('Target.setAutoAttach', noop);
    this.registerMethod('Target.setDiscoverTargets', noop);

    // Debugger, Profiler, and HeapProfiler are handled by V8InspectorProxy
    // when available.  These stubs remain only as comments — the domain
    // proxy in handleMessage routes to V8 first, falling back to empty
    // responses for unhandled methods.

    // DOM storage / IndexedDB / ServiceWorker stubs
    this.registerMethod('DOMStorage.enable', noop);
    this.registerMethod('IndexedDB.enable', noop);
    this.registerMethod('ServiceWorker.enable', noop);
    this.registerMethod('CacheStorage.requestCacheNames', () => ({caches: []}));

    // Emulation stubs
    this.registerMethod('Emulation.setAutoDarkModeOverride', noop);
    this.registerMethod('Emulation.setFocusEmulationEnabled', noop);
    this.registerMethod('Emulation.setEmulatedMedia', noop);
    this.registerMethod('Emulation.setEmulatedVisionDeficiency', noop);

    // DOM domain stubs
    this.registerMethod('DOM.setDiscoverMode', noop);
    this.registerMethod('DOMDebugger.setBreakOnCSPViolation', noop);

    // Page domain — getNavigationHistory MUST return entries or DevTools crashes
    this.registerMethod('Page.getNavigationHistory', () => ({
      currentIndex: 0,
      entries: [
        {
          id: 0,
          url: 'terminal://localhost',
          userTypedURL: 'terminal://localhost',
          title: 'Terminal DOM',
          transitionType: 'typed',
        },
      ],
    }));
    this.registerMethod('Page.setAdBlockingEnabled', noop);
    this.registerMethod('Page.addScriptToEvaluateOnNewDocument', () => ({identifier: '1'}));

    // Overlay domain extras
    this.registerMethod('Overlay.setShowViewportSizeOnResize', noop);
    this.registerMethod('Overlay.setShowGridOverlays', noop);
    this.registerMethod('Overlay.setShowFlexOverlays', noop);
    this.registerMethod('Overlay.setShowScrollSnapOverlays', noop);
    this.registerMethod('Overlay.setShowContainerQueryOverlays', noop);
    this.registerMethod('Overlay.setShowIsolatedElements', noop);

    // Network extras
    this.registerMethod('Network.setBlockedURLs', noop);
    this.registerMethod('Network.emulateNetworkConditionsByRule', noop);
    this.registerMethod('Network.overrideNetworkState', noop);
    this.registerMethod('Network.clearAcceptedEncodingsOverride', noop);

    // Runtime extras
    this.registerMethod('Runtime.addBinding', noop);

    // Target extras
    this.registerMethod('Target.setRemoteLocations', noop);

    // Storage / Audits / Animation / Autofill
    this.registerMethod('Storage.getStorageKey', () => ({storageKey: 'terminal://'}));
    this.registerMethod('Audits.enable', noop);
    this.registerMethod('Animation.enable', noop);
    this.registerMethod('Autofill.enable', noop);
    this.registerMethod('Autofill.setAddresses', noop);

    // Debugger.setBreakpointByUrl is handled by V8InspectorProxy
  }
}
