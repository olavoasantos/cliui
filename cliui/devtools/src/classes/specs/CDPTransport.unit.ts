import {describe, it, expect, afterEach} from 'vitest';
import {WebSocket as WS} from 'ws';
import {CDPTransport} from '../CDPTransport';

import type {CDPResponse, TargetDescriptor} from '../../types';

/**
 * Connects a ws client to the CDP transport's WebSocket endpoint.
 */
async function connectCDP(port: number, targetId: string): Promise<WS> {
  return new Promise<WS>((resolve, reject) => {
    const client = new WS(`ws://127.0.0.1:${port}/devtools/${targetId}`);
    client.once('open', () => resolve(client));
    client.once('error', reject);
  });
}

/**
 * Sends a CDP command and waits for the response.
 */
function sendCommand(
  client: WS,
  id: number,
  method: string,
  params: Record<string, unknown> = {},
): Promise<CDPResponse> {
  return new Promise((resolve) => {
    client.once('message', (data: Buffer) => {
      resolve(JSON.parse(data.toString('utf8')) as CDPResponse);
    });
    client.send(JSON.stringify({id, method, params}));
  });
}

/**
 * Makes an HTTP GET request and returns the parsed JSON body.
 */
async function httpGet(port: number, path: string): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return res.json();
}

describe('CDPTransport', () => {
  let transport: CDPTransport;
  const clients: WS[] = [];

  afterEach(async () => {
    for (const client of clients) {
      try {
        if (client.readyState !== WS.CLOSED && client.readyState !== WS.CLOSING) {
          client.close();
          await new Promise<void>((resolve) => client.once('close', () => resolve()));
        }
      } catch {
        // already closed
      }
    }
    clients.length = 0;
    if (transport) {
      try {
        await transport.close();
      } catch {
        // already closed
      }
    }
  });

  it('serves /json/list with type "page"', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const body = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];

    expect(body).toHaveLength(1);
    expect(body[0].type).toBe('page');
    expect(body[0].title).toBe('Terminal DOM');
    expect(body[0].webSocketDebuggerUrl).toContain('ws://');
    expect(body[0].id).toBeTruthy();
  });

  it('serves /json as alias for /json/list', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const body = (await httpGet(addr.port, '/json')) as TargetDescriptor[];

    expect(body).toHaveLength(1);
    expect(body[0].type).toBe('page');
  });

  it('serves /json/version with protocol info', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const body = (await httpGet(addr.port, '/json/version')) as Record<string, string>;

    expect(body['Protocol-Version']).toBe('1.3');
    expect(body['Browser']).toContain('Terminal DOM');
  });

  it('dispatches CDP commands to registered handlers', async () => {
    transport = new CDPTransport({port: 0});
    transport.registerMethod('Test.method', (params) => ({
      echo: params['value'],
    }));
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    // Get target ID from discovery
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Test.method', {value: 'hello'});

    expect(response.id).toBe(1);
    expect(response.result).toEqual({echo: 'hello'});
  });

  it('responds with empty result for unknown methods', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 42, 'Unknown.method');

    expect(response.id).toBe(42);
    expect(response.result).toEqual({});
  });

  it('responds to Page.enable startup stub', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Page.enable');

    expect(response.id).toBe(1);
    expect(response.result).toEqual({});
  });

  it('responds to Page.getResourceTree with frame tree', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 2, 'Page.getResourceTree');

    expect(response.id).toBe(2);
    const tree = response.result as any;
    expect(tree.frameTree.frame.url).toBe('terminal://localhost');
    expect(tree.frameTree.frame.mimeType).toBe('text/html');
  });

  it('responds to Inspector.enable startup stub', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Inspector.enable');
    expect(response.id).toBe(1);
    expect(response.result).toEqual({});
  });

  it('responds to Network.enable startup stub', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Network.enable');
    expect(response.id).toBe(1);
    expect(response.result).toEqual({});
  });

  it('responds to Target.setAutoAttach startup stub', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Target.setAutoAttach');
    expect(response.id).toBe(1);
    expect(response.result).toEqual({});
  });

  it('sends CDP events to a client', async () => {
    transport = new CDPTransport({port: 0});
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Wait for connection to be tracked
    await new Promise<void>((resolve) => {
      transport.onConnect(() => resolve());
      if (transport.clients.size > 0) resolve();
    });

    const received = new Promise<{method: string; params: Record<string, unknown>}>((resolve) => {
      client.once('message', (data: Buffer) => {
        resolve(JSON.parse(data.toString('utf8')));
      });
    });

    transport.broadcastEvent({
      method: 'DOM.childNodeInserted',
      params: {parentNodeId: 1, node: {nodeId: 2}},
    });

    const event = await received;
    expect(event.method).toBe('DOM.childNodeInserted');
    expect(event.params.parentNodeId).toBe(1);
  });

  it('emits connect and disconnect callbacks', async () => {
    transport = new CDPTransport({port: 0});

    let connected = false;
    let disconnected = false;
    transport.onConnect(() => {
      connected = true;
    });
    transport.onDisconnect(() => {
      disconnected = true;
    });

    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Wait for connect callback
    await new Promise<void>((resolve) => {
      const check = (): void => {
        if (connected) resolve();
        else setTimeout(check, 10);
      };
      check();
    });
    expect(connected).toBe(true);

    // Close client
    const closePromise = new Promise<void>((resolve) => {
      const check = (): void => {
        if (disconnected) resolve();
        else setTimeout(check, 10);
      };
      check();
    });
    client.close();
    await closePromise;

    expect(disconnected).toBe(true);
  });

  it('handles async domain handlers', async () => {
    transport = new CDPTransport({port: 0});
    transport.registerMethod('Async.method', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return {delayed: true};
    });
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Async.method');
    expect(response.result).toEqual({delayed: true});
  });

  it('handles handler errors gracefully', async () => {
    transport = new CDPTransport({port: 0});
    transport.registerMethod('Fail.method', () => {
      throw new Error('handler failed');
    });
    await transport.listen();
    const addr = transport.server.server.address() as {port: number};

    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    const response = await sendCommand(client, 1, 'Fail.method');
    expect(response.id).toBe(1);
    expect((response.result as any).error).toBe('handler failed');
  });
});
