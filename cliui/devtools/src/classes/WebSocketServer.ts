import {createServer} from 'node:http';
import {WebSocketServer as WSServer} from 'ws';
import {DEFAULT_CDP_PORT, WS_CLOSE_GOING_AWAY} from '../constants';

import type {Server} from 'node:http';
import type {WebSocket} from 'ws';
import type {
  ConnectionCallback,
  MessageCallback,
  CloseCallback,
  ErrorCallback,
  WebSocketServerOptions,
} from '../types';

/**
 * Minimal WebSocket server for Chrome DevTools Protocol communication.
 *
 * Wraps the `ws` library over Node's built-in `http` module.  Supports
 * multiple concurrent connections and exposes connection, message, close,
 * and error callbacks.
 *
 * Only text frames are used — CDP communicates exclusively via JSON.
 */
export class WebSocketServer {
  /** Connected WebSocket clients. */
  readonly connections = new Set<WebSocket>();

  private readonly httpServer: Server;
  private readonly wss: WSServer;
  private readonly port: number;
  private readonly host: string;

  private onConnection: ConnectionCallback | null = null;
  private onMessage: MessageCallback | null = null;
  private onClose: CloseCallback | null = null;
  private onError: ErrorCallback | null = null;

  /**
   * Creates a new WebSocket server.
   *
   * @param options - Server configuration.
   */
  constructor(options: WebSocketServerOptions = {}) {
    this.port = options.port ?? DEFAULT_CDP_PORT;
    this.host = options.host ?? '127.0.0.1';

    this.httpServer = createServer();
    this.wss = new WSServer({server: this.httpServer});

    this.wss.on('connection', (socket: WebSocket) => {
      this.connections.add(socket);
      this.onConnection?.(socket);

      socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
        const message = Array.isArray(data)
          ? Buffer.concat(data).toString('utf8')
          : data.toString('utf8');
        this.onMessage?.(socket, message);
      });

      socket.on('close', (code: number, reason: Buffer) => {
        this.connections.delete(socket);
        this.onClose?.(socket, code, reason.toString('utf8'));
      });

      socket.on('error', (err: Error) => {
        this.onError?.(err);
      });
    });

    this.wss.on('error', (err: Error) => {
      this.onError?.(err);
    });
  }

  /**
   * The underlying HTTP server instance.
   *
   * Exposed so the CDP transport can attach request handlers
   * for the discovery endpoint.
   */
  get server(): Server {
    return this.httpServer;
  }

  /**
   * Registers a callback invoked when a new WebSocket connection is established.
   *
   * @param callback - Connection handler.
   */
  onconnection(callback: ConnectionCallback): void {
    this.onConnection = callback;
  }

  /**
   * Registers a callback invoked when a text message is received.
   *
   * @param callback - Message handler receiving the socket and raw string data.
   */
  onmessage(callback: MessageCallback): void {
    this.onMessage = callback;
  }

  /**
   * Registers a callback invoked when a connection closes.
   *
   * @param callback - Close handler receiving the socket, close code, and reason.
   */
  onclose(callback: CloseCallback): void {
    this.onClose = callback;
  }

  /**
   * Registers a callback invoked when a WebSocket or server error occurs.
   *
   * @param callback - Error handler.
   */
  onerror(callback: ErrorCallback): void {
    this.onError = callback;
  }

  /**
   * Sends a text message to a specific connected client.
   *
   * @param socket - Target WebSocket connection.
   * @param data   - String data to send.
   */
  send(socket: WebSocket, data: string): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(data);
    }
  }

  /**
   * Broadcasts a text message to all connected clients.
   *
   * @param data - String data to send.
   */
  broadcast(data: string): void {
    for (const socket of this.connections) {
      this.send(socket, data);
    }
  }

  /**
   * Starts listening on the configured port and host.
   *
   * @returns A promise that resolves once the server is listening.
   */
  async listen(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.port, this.host, () => {
        this.httpServer.removeListener('error', reject);
        resolve();
      });
    });
  }

  /**
   * Gracefully shuts down the server.
   *
   * Closes all active WebSocket connections, then shuts down the
   * underlying HTTP and WebSocket servers.
   *
   * @returns A promise that resolves once shutdown is complete.
   */
  async close(): Promise<void> {
    for (const socket of this.connections) {
      socket.close(WS_CLOSE_GOING_AWAY, 'Server shutting down');
    }
    this.connections.clear();

    return new Promise<void>((resolve, reject) => {
      this.wss.close((wssErr) => {
        if (wssErr) {
          reject(wssErr);
          return;
        }
        this.httpServer.close((httpErr) => {
          if (httpErr) {
            reject(httpErr);
          } else {
            resolve();
          }
        });
      });
    });
  }
}
