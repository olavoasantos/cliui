import {describe, it, expect, afterEach} from 'vitest';
import {WebSocket as WS} from 'ws';
import {WebSocketServer} from '../WebSocketServer';

/**
 * Connects a ws client and waits for the 'open' event.
 */
function connect(port: number): Promise<WS> {
  return new Promise<WS>((resolve, reject) => {
    const client = new WS(`ws://127.0.0.1:${port}`);
    client.once('open', () => resolve(client));
    client.once('error', reject);
  });
}

/**
 * Closes a client and waits for the 'close' event.
 */
function closeClient(client: WS): Promise<void> {
  return new Promise<void>((resolve) => {
    if (client.readyState === WS.CLOSED) {
      resolve();
      return;
    }
    client.once('close', () => resolve());
    client.close();
  });
}

/**
 * Waits until the server has at least `n` connections.
 */
function waitForConnections(server: WebSocketServer, n: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (server.connections.size >= n) {
      resolve();
      return;
    }
    const interval = setInterval(() => {
      if (server.connections.size >= n) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
}

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  const clients: WS[] = [];

  afterEach(async () => {
    for (const client of clients) {
      try {
        if (client.readyState !== WS.CLOSED && client.readyState !== WS.CLOSING) {
          await closeClient(client);
        }
      } catch {
        // already closed
      }
    }
    clients.length = 0;
    if (server) {
      try {
        await server.close();
      } catch {
        // already closed
      }
    }
  });

  it('listens on the specified port', async () => {
    server = new WebSocketServer({port: 0});
    await server.listen();

    const addr = server.server.address();
    expect(addr).not.toBeNull();
    expect(typeof addr).toBe('object');
  });

  it('accepts WebSocket connections', async () => {
    server = new WebSocketServer({port: 0});

    const connected = new Promise<void>((resolve) => {
      server.onconnection(() => resolve());
    });

    await server.listen();
    const addr = server.server.address() as {port: number};

    const client = await connect(addr.port);
    clients.push(client);

    await connected;
    expect(server.connections.size).toBe(1);
  });

  it('receives text messages from clients', async () => {
    server = new WebSocketServer({port: 0});

    const received = new Promise<string>((resolve) => {
      server.onmessage((_socket, data) => resolve(data));
    });

    await server.listen();
    const addr = server.server.address() as {port: number};

    const client = await connect(addr.port);
    clients.push(client);
    client.send('hello');

    const msg = await received;
    expect(msg).toBe('hello');
  });

  it('sends text messages to clients', async () => {
    server = new WebSocketServer({port: 0});

    const ready = new Promise<void>((resolve) => {
      server.onconnection(() => resolve());
    });

    await server.listen();
    const addr = server.server.address() as {port: number};

    const client = await connect(addr.port);
    clients.push(client);
    await ready;

    const received = new Promise<string>((resolve) => {
      client.once('message', (data: Buffer) => resolve(data.toString('utf8')));
    });

    const [socket] = server.connections;
    server.send(socket!, 'world');

    const msg = await received;
    expect(msg).toBe('world');
  });

  it('broadcasts messages to all clients', async () => {
    server = new WebSocketServer({port: 0});
    await server.listen();
    const addr = server.server.address() as {port: number};

    const client1 = await connect(addr.port);
    const client2 = await connect(addr.port);
    clients.push(client1, client2);

    await waitForConnections(server, 2);

    const p1 = new Promise<string>((resolve) => {
      client1.once('message', (data: Buffer) => resolve(data.toString('utf8')));
    });
    const p2 = new Promise<string>((resolve) => {
      client2.once('message', (data: Buffer) => resolve(data.toString('utf8')));
    });

    server.broadcast('ping');

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(m1).toBe('ping');
    expect(m2).toBe('ping');
  });

  it('emits close callback when a client disconnects', async () => {
    server = new WebSocketServer({port: 0});

    const closed = new Promise<{code: number}>((resolve) => {
      server.onclose((_socket, code) => resolve({code}));
    });

    await server.listen();
    const addr = server.server.address() as {port: number};

    const client = await connect(addr.port);
    clients.push(client);

    await waitForConnections(server, 1);

    client.close(1000, 'done');

    const result = await closed;
    expect(result.code).toBe(1000);
    expect(server.connections.size).toBe(0);
  });

  it('handles multiple concurrent connections', async () => {
    server = new WebSocketServer({port: 0});
    await server.listen();
    const addr = server.server.address() as {port: number};

    const c1 = await connect(addr.port);
    const c2 = await connect(addr.port);
    const c3 = await connect(addr.port);
    clients.push(c1, c2, c3);

    await waitForConnections(server, 3);

    expect(server.connections.size).toBe(3);

    // Close one — others remain
    const closedPromise = new Promise<void>((resolve) => {
      server.onclose(() => resolve());
    });
    c2.close();
    await closedPromise;

    expect(server.connections.size).toBe(2);
  });

  it('handles JSON message round-trip', async () => {
    server = new WebSocketServer({port: 0});

    server.onmessage((socket, data) => {
      const parsed = JSON.parse(data) as {id: number; method: string};
      server.send(socket, JSON.stringify({id: parsed.id, result: {success: true}}));
    });

    await server.listen();
    const addr = server.server.address() as {port: number};

    const client = await connect(addr.port);
    clients.push(client);

    const response = new Promise<string>((resolve) => {
      client.once('message', (data: Buffer) => resolve(data.toString('utf8')));
    });

    client.send(JSON.stringify({id: 1, method: 'Test.echo'}));

    const result = JSON.parse(await response) as {id: number; result: {success: boolean}};
    expect(result.id).toBe(1);
    expect(result.result.success).toBe(true);
  });

  it('gracefully closes all connections on shutdown', async () => {
    server = new WebSocketServer({port: 0});
    await server.listen();
    const addr = server.server.address() as {port: number};

    const c1 = await connect(addr.port);
    const c2 = await connect(addr.port);
    clients.push(c1, c2);

    await waitForConnections(server, 2);

    const closedPromises = [c1, c2].map(
      (c) => new Promise<void>((resolve) => c.once('close', () => resolve())),
    );

    await server.close();
    await Promise.all(closedPromises);

    expect(c1.readyState).toBe(WS.CLOSED);
    expect(c2.readyState).toBe(WS.CLOSED);
  });

  it('does not throw when sending to a closed socket', async () => {
    server = new WebSocketServer({port: 0});
    await server.listen();
    const addr = server.server.address() as {port: number};

    const ready = new Promise<void>((resolve) => {
      server.onconnection(() => resolve());
    });

    const client = await connect(addr.port);
    clients.push(client);
    await ready;

    const [socket] = server.connections;

    const closedPromise = new Promise<void>((resolve) => {
      server.onclose(() => resolve());
    });
    client.close();
    await closedPromise;

    // Should not throw — socket is no longer OPEN
    expect(() => server.send(socket!, 'test')).not.toThrow();
  });
});
