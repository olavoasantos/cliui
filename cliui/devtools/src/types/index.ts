import type {WebSocket} from 'ws';

/** Callback for WebSocket connection events. */
export type ConnectionCallback = (socket: WebSocket) => void;

/** Callback for WebSocket message events. */
export type MessageCallback = (socket: WebSocket, data: string) => void;

/** Callback for WebSocket close events. */
export type CloseCallback = (socket: WebSocket, code: number, reason: string) => void;

/** Callback for WebSocket server error events. */
export type ErrorCallback = (error: Error) => void;

/**
 * Options for creating a {@link WebSocketServer}.
 */
export interface WebSocketServerOptions {
  /** TCP port to listen on. Defaults to {@link DEFAULT_CDP_PORT}. */
  port?: number;

  /** Hostname to bind to. Defaults to `'127.0.0.1'`. */
  host?: string;
}

/**
 * A CDP command message received from DevTools.
 *
 * Every CDP message contains a numeric `id` for request/response correlation,
 * a `method` string identifying the domain and command (e.g. `"DOM.getDocument"`),
 * and optional `params`.
 */
export interface CDPCommand {
  /** Request correlation ID. */
  id: number;

  /** CDP domain-qualified method name (e.g. `"DOM.getDocument"`). */
  method: string;

  /** Optional command parameters. */
  params?: Record<string, unknown>;
}

/**
 * A CDP response sent back to DevTools.
 */
export interface CDPResponse {
  /** Request correlation ID matching the originating {@link CDPCommand.id}. */
  id: number;

  /** Result payload. */
  result: Record<string, unknown>;
}

/**
 * A CDP event pushed to DevTools.
 */
export interface CDPEvent {
  /** CDP domain-qualified event name (e.g. `"DOM.childNodeInserted"`). */
  method: string;

  /** Event payload. */
  params: Record<string, unknown>;
}

/**
 * Describes a debuggable target for the `/json/list` discovery endpoint.
 *
 * The `type` field **must** be `"page"` — Chrome launches the Node.js
 * inspector UI (which hides the Elements/Styles panels) if it sees `"node"`.
 */
export interface TargetDescriptor {
  description: string;
  devtoolsFrontendUrl: string;
  id: string;
  title: string;
  type: 'page';
  url: string;
  webSocketDebuggerUrl: string;
}

/**
 * Handler function for a CDP domain method.
 *
 * Receives the command parameters and returns a result object (or void for
 * commands that only need acknowledgment).
 */
export type CDPMethodHandler = (
  params: Record<string, unknown>,
) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;

/**
 * A CDP `RemoteObject` describing a JavaScript value for the Runtime domain.
 */
export interface RemoteObject {
  type: 'object' | 'function' | 'undefined' | 'string' | 'number' | 'boolean' | 'symbol' | 'bigint';
  subtype?:
    | 'null'
    | 'array'
    | 'node'
    | 'regexp'
    | 'date'
    | 'map'
    | 'set'
    | 'error'
    | 'proxy'
    | 'promise'
    | 'typedarray';
  className?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
}

/**
 * A CSS property entry returned by the CSS domain.
 *
 * Includes the required `range` object to prevent DevTools from crashing
 * when positioning the edit cursor.
 */
export interface CSSPropertyEntry {
  name: string;
  value: string;
  disabled?: boolean;
  implicit?: boolean;
  range?: SourceRange;
}

/**
 * Source location range used in CSS domain responses.
 *
 * DevTools **crashes** when CSS property ranges are missing.
 */
export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Options for the {@link DevToolsBridge}.
 */
export interface DevToolsBridgeOptions {
  /** TCP port for the CDP server. Defaults to 9222. */
  port?: number;

  /** Hostname to bind to. Defaults to `'127.0.0.1'`. */
  host?: string;
}
