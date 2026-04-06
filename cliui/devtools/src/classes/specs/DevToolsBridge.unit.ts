import {describe, it, expect, afterEach} from 'vitest';
import {WebSocket as WS} from 'ws';
import {Window} from '@cliui/dom';
import {StyleEngine, CSSParser, SelectorMatcher} from '@cliui/terminal/css';
import {DevToolsBridge} from '../DevToolsBridge';

import type {CDPResponse, TargetDescriptor} from '../../types';

async function httpGet(port: number, path: string): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return res.json();
}

function connectCDP(port: number, targetId: string): Promise<WS> {
  return new Promise<WS>((resolve, reject) => {
    const client = new WS(`ws://127.0.0.1:${port}/devtools/${targetId}`);
    client.once('open', () => resolve(client));
    client.once('error', reject);
  });
}

function sendCommand(
  client: WS,
  id: number,
  method: string,
  params: Record<string, unknown> = {},
): Promise<CDPResponse> {
  return new Promise((resolve) => {
    const handler = (data: Buffer): void => {
      const msg = JSON.parse(data.toString('utf8')) as CDPResponse;
      // Skip CDP events (they have no `id`); wait for our response
      if (msg.id === id) {
        client.removeListener('message', handler);
        resolve(msg);
      }
    };
    client.on('message', handler);
    client.send(JSON.stringify({id, method, params}));
  });
}

describe('DevToolsBridge', () => {
  let bridge: DevToolsBridge;
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
    if (bridge) {
      await bridge.close();
    }
  });

  function createBridge(): DevToolsBridge {
    const window = new Window();
    const styleEngine = new StyleEngine();
    styleEngine.attach(window.document);

    return new DevToolsBridge({
      window,
      document: window.document,
      styleEngine,
      selectorMatcher: new SelectorMatcher(),
      cssParser: new CSSParser(),
      terminalInstance: {name: 'test-terminal'},
      options: {port: 0},
    });
  }

  it('starts and stops without error', async () => {
    bridge = createBridge();
    await bridge.listen();

    expect(bridge.isListening).toBe(true);

    await bridge.close();
    expect(bridge.isListening).toBe(false);
  });

  it('serves /json/list discovery endpoint', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('page');
  });

  it('accepts WebSocket connections from DevTools', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];

    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Should be able to send a command
    const response = await sendCommand(client, 1, 'DOM.enable');
    expect(response.id).toBe(1);
  });

  it('handles full DOM inspection round-trip', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Enable DOM domain
    await sendCommand(client, 1, 'DOM.enable');

    // Get document
    const docResponse = await sendCommand(client, 2, 'DOM.getDocument', {depth: -1});
    const root = (docResponse.result as any).root;

    expect(root.nodeType).toBe(9);
    expect(root.nodeName).toBe('#DOCUMENT');
  });

  it('routes CSS domain commands through the bridge', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // CSS.enable should succeed
    const enableResponse = await sendCommand(client, 1, 'CSS.enable');
    expect(enableResponse.id).toBe(1);
    expect(enableResponse.result).toBeDefined();
  });

  it('handles Runtime evaluation', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    await sendCommand(client, 1, 'Runtime.enable');

    const evalResponse = await sendCommand(client, 2, 'Runtime.evaluate', {
      expression: '2 + 3',
    });
    const result = (evalResponse.result as any).result;

    expect(result.type).toBe('number');
    expect(result.value).toBe(5);
  });

  it('handles startup handshake stubs', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Send typical DevTools startup sequence
    const r1 = await sendCommand(client, 1, 'Page.enable');
    expect(r1.id).toBe(1);

    const r2 = await sendCommand(client, 2, 'Inspector.enable');
    expect(r2.id).toBe(2);

    const r3 = await sendCommand(client, 3, 'Network.enable');
    expect(r3.id).toBe(3);

    const r4 = await sendCommand(client, 4, 'Target.setAutoAttach');
    expect(r4.id).toBe(4);
  });

  it('cleans up on close', async () => {
    bridge = createBridge();
    await bridge.listen();

    const addr = (bridge as any).transport.server.server.address() as {port: number};
    const targets = (await httpGet(addr.port, '/json/list')) as TargetDescriptor[];
    const client = await connectCDP(addr.port, targets[0].id);
    clients.push(client);

    // Register some nodes
    const window = (bridge as any).window as Window;
    bridge.nodes.register(window.document);

    expect(bridge.nodes.size).toBeGreaterThan(0);

    await bridge.close();

    expect(bridge.nodes.size).toBe(0);
    expect(bridge.objects.size).toBe(0);
  });

  it('provides hooks for mutation bridge integration', () => {
    bridge = createBridge();
    const hooks = bridge.getHooks();

    expect(hooks.insertChild).toBeDefined();
    expect(hooks.removeChild).toBeDefined();
    expect(hooks.setAttribute).toBeDefined();
    expect(hooks.removeAttribute).toBeDefined();
    expect(hooks.setText).toBeDefined();
  });
});
