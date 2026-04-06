import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {ObjectRegistry} from '../ObjectRegistry';
import {RuntimeDomainHandler} from '../RuntimeDomainHandler';
import {NodeRegistry} from '../NodeRegistry';
import {DOMDomainHandler} from '../DOMDomainHandler';

import type {CDPEvent, CDPMethodHandler} from '../../types';

function createMockTransport() {
  const handlers = new Map<string, CDPMethodHandler>();
  const events: CDPEvent[] = [];
  return {
    handlers,
    events,
    registerMethod(method: string, handler: CDPMethodHandler) {
      handlers.set(method, handler);
    },
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
    async call(method: string, params: Record<string, unknown> = {}) {
      const handler = handlers.get(method);
      if (!handler) throw new Error(`No handler for ${method}`);
      return (await handler(params)) ?? {};
    },
  };
}

describe('RuntimeDomainHandler', () => {
  let window: InstanceType<typeof Window>;
  let transport: ReturnType<typeof createMockTransport>;
  let objectRegistry: ObjectRegistry;
  let handler: RuntimeDomainHandler;

  beforeEach(() => {
    window = new Window();
    transport = createMockTransport();
    objectRegistry = new ObjectRegistry();
    const nodeRegistry = new NodeRegistry();
    const domHandler = new DOMDomainHandler(transport as any, nodeRegistry, window.document);

    handler = new RuntimeDomainHandler(
      transport as any,
      objectRegistry,
      window,
      window.document,
      domHandler,
      {name: 'test-terminal'}, // mock terminal instance
    );
    handler.register();
  });

  describe('Runtime.evaluate', () => {
    it('evaluates simple expressions', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: '1 + 2',
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.type).toBe('number');
      expect(remoteObj.value).toBe(3);
    });

    it('evaluates string expressions', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: '"hello"',
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.type).toBe('string');
      expect(remoteObj.value).toBe('hello');
    });

    it('provides $0 in the evaluation scope', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);

      // Set $0 via DOM handler
      const nodeRegistry = new NodeRegistry();
      const domHandler = new DOMDomainHandler(transport as any, nodeRegistry, window.document);
      const divId = nodeRegistry.register(div);
      domHandler.inspectedNode = div;

      handler = new RuntimeDomainHandler(
        transport as any,
        objectRegistry,
        window,
        window.document,
        domHandler,
        null,
      );
      handler.register();

      const result = await transport.call('Runtime.evaluate', {
        expression: '$0 !== null',
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.type).toBe('boolean');
      expect(remoteObj.value).toBe(true);
    });

    it('provides document in the evaluation scope', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: 'typeof document',
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.type).toBe('string');
      expect(remoteObj.value).toBe('object');
    });

    it('provides terminal in the evaluation scope', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: 'terminal.name',
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.value).toBe('test-terminal');
    });

    it('returns error details on evaluation failure', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: 'undefinedVariable.property',
      });
      expect(result['exceptionDetails']).toBeDefined();
      const details = result['exceptionDetails'] as any;
      expect(details.text).toBeTruthy();
    });

    it('returns by value when requested', async () => {
      const result = await transport.call('Runtime.evaluate', {
        expression: '{a: 1, b: 2}',
        returnByValue: true,
      });
      const remoteObj = result['result'] as any;
      expect(remoteObj.value).toEqual({a: 1, b: 2});
    });
  });

  describe('Runtime.getProperties', () => {
    it('returns own properties of an object', async () => {
      const obj = {foo: 'bar', num: 42};
      const id = objectRegistry.register(obj);

      const result = await transport.call('Runtime.getProperties', {
        objectId: id,
        ownProperties: true,
      });

      const props = result['result'] as any[];
      const fooProp = props.find((p) => p.name === 'foo');
      expect(fooProp).toBeDefined();
      expect(fooProp.value.type).toBe('string');
      expect(fooProp.value.value).toBe('bar');
    });

    it('returns empty array for unknown objectId', async () => {
      const result = await transport.call('Runtime.getProperties', {
        objectId: 'nonexistent',
      });
      expect(result['result']).toEqual([]);
    });
  });

  describe('Runtime.callFunctionOn', () => {
    it('calls a function on a given object', async () => {
      const obj = {x: 10};
      const id = objectRegistry.register(obj);

      const result = await transport.call('Runtime.callFunctionOn', {
        functionDeclaration: 'function() { return this.x * 2; }',
        objectId: id,
      });

      const remoteObj = result['result'] as any;
      expect(remoteObj.type).toBe('number');
      expect(remoteObj.value).toBe(20);
    });

    it('passes arguments to the function', async () => {
      const obj = {x: 5};
      const id = objectRegistry.register(obj);

      const result = await transport.call('Runtime.callFunctionOn', {
        functionDeclaration: 'function(y) { return this.x + y; }',
        objectId: id,
        arguments: [{value: 3}],
        returnByValue: true,
      });

      const remoteObj = result['result'] as any;
      expect(remoteObj.value).toBe(8);
    });

    it('returns error details on failure', async () => {
      const result = await transport.call('Runtime.callFunctionOn', {
        functionDeclaration: 'function() { throw new Error("test error"); }',
      });
      expect(result['exceptionDetails']).toBeDefined();
    });
  });

  describe('Runtime.releaseObject', () => {
    it('releases an object from the registry', async () => {
      const obj = {test: true};
      const id = objectRegistry.register(obj);
      expect(objectRegistry.size).toBe(1);

      await transport.call('Runtime.releaseObject', {objectId: id});
      expect(objectRegistry.size).toBe(0);
    });
  });

  describe('Runtime.releaseObjectGroup', () => {
    it('releases all objects in a group', async () => {
      objectRegistry.register({a: 1}, 'test-group');
      objectRegistry.register({b: 2}, 'test-group');
      objectRegistry.register({c: 3}, 'other-group');
      expect(objectRegistry.size).toBe(3);

      await transport.call('Runtime.releaseObjectGroup', {objectGroup: 'test-group'});
      expect(objectRegistry.size).toBe(1);
    });
  });

  describe('emitConsoleAPICalled', () => {
    it('broadcasts Runtime.consoleAPICalled events', () => {
      handler.emitConsoleAPICalled('log', ['hello', 42], Date.now());

      const event = transport.events.find((e) => e.method === 'Runtime.consoleAPICalled');
      expect(event).toBeDefined();
      expect(event!.params.type).toBe('log');
      expect((event!.params.args as any[]).length).toBe(2);
    });
  });
});

describe('ObjectRegistry', () => {
  let registry: ObjectRegistry;

  beforeEach(() => {
    registry = new ObjectRegistry();
  });

  it('serializes null', () => {
    const result = registry.serialize(null);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('null');
  });

  it('serializes undefined', () => {
    const result = registry.serialize(undefined);
    expect(result.type).toBe('undefined');
  });

  it('serializes primitives', () => {
    expect(registry.serialize('hello').type).toBe('string');
    expect(registry.serialize(42).type).toBe('number');
    expect(registry.serialize(true).type).toBe('boolean');
  });

  it('serializes functions', () => {
    const result = registry.serialize(() => {});
    expect(result.type).toBe('function');
    expect(result.objectId).toBeDefined();
  });

  it('serializes arrays', () => {
    const result = registry.serialize([1, 2, 3]);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('array');
    expect(result.description).toBe('Array(3)');
  });

  it('serializes errors', () => {
    const result = registry.serialize(new Error('test'));
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('error');
  });

  it('serializes DOM nodes', () => {
    const window = new Window();
    const div = window.document.createElement('div');
    const result = registry.serialize(div);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('node');
  });

  it('serializes plain objects', () => {
    const result = registry.serialize({key: 'value'});
    expect(result.type).toBe('object');
    expect(result.objectId).toBeDefined();
  });
});
