import type {CDPTransport} from './CDPTransport';
import type {ObjectRegistry} from './ObjectRegistry';
import type {DOMDomainHandler} from './DOMDomainHandler';
import type {Window, Document} from '@cliui/dom';

/**
 * CDP Runtime domain handler for expression evaluation and object inspection.
 *
 * Powers DevTools' Console panel and Properties sidebar.  Evaluation
 * runs in a scope that provides `$0` (inspected node), `window`,
 * `document`, and the terminal instance.
 */
export class RuntimeDomainHandler {
  private readonly transport: CDPTransport;
  private readonly objectRegistry: ObjectRegistry;
  private readonly window: Window;
  private readonly document: Document;
  private readonly domHandler: DOMDomainHandler;
  private readonly terminalInstance: unknown;

  constructor(
    transport: CDPTransport,
    objectRegistry: ObjectRegistry,
    window: Window,
    document: Document,
    domHandler: DOMDomainHandler,
    terminalInstance: unknown,
  ) {
    this.transport = transport;
    this.objectRegistry = objectRegistry;
    this.window = window;
    this.document = document;
    this.domHandler = domHandler;
    this.terminalInstance = terminalInstance;
  }

  /** Registers all Runtime domain method handlers. */
  register(): void {
    this.transport.registerMethod('Runtime.enable', () => this.enable());
    this.transport.registerMethod('Runtime.disable', () => ({}));
    this.transport.registerMethod('Runtime.evaluate', (params) => this.evaluate(params));
    this.transport.registerMethod('Runtime.getProperties', (params) => this.getProperties(params));
    this.transport.registerMethod('Runtime.callFunctionOn', (params) =>
      this.callFunctionOn(params),
    );
    this.transport.registerMethod('Runtime.releaseObject', (params) => this.releaseObject(params));
    this.transport.registerMethod('Runtime.releaseObjectGroup', (params) =>
      this.releaseObjectGroup(params),
    );
    this.transport.registerMethod('Runtime.compileScript', () => ({}));
    this.transport.registerMethod('Runtime.globalLexicalScopeNames', () => ({names: []}));
    this.transport.registerMethod('Runtime.runIfWaitingForDebugger', () => ({}));
    this.transport.registerMethod('Runtime.getIsolateId', () => ({id: 'terminal-dom'}));
    this.transport.registerMethod('Runtime.getHeapUsage', () => ({
      usedSize: process.memoryUsage().heapUsed,
      totalSize: process.memoryUsage().heapTotal,
    }));
  }

  /**
   * `Runtime.enable` — emits the execution context that DevTools Console
   * requires before it will accept input.
   */
  private enable(): Record<string, unknown> {
    this.transport.broadcastEvent({
      method: 'Runtime.executionContextCreated',
      params: {
        context: {
          id: 1,
          origin: 'terminal://localhost',
          name: 'Terminal DOM',
          uniqueId: 'terminal-dom-context',
          auxData: {isDefault: true, type: 'default', frameId: 'main'},
        },
      },
    });
    return {};
  }

  /**
   * Emits a `Runtime.consoleAPICalled` event.
   *
   * Used by the Log domain to forward console calls.
   */
  emitConsoleAPICalled(type: string, args: unknown[], timestamp: number): void {
    this.transport.broadcastEvent({
      method: 'Runtime.consoleAPICalled',
      params: {
        type,
        args: args.map((a) => this.objectRegistry.serialize(a, 'console')),
        executionContextId: 1,
        timestamp,
      },
    });
  }

  /**
   * `Runtime.evaluate` — evaluates an expression in the terminal scope.
   */
  private evaluate(params: Record<string, unknown>): Record<string, unknown> {
    const expression = params['expression'] as string;
    const objectGroup = params['objectGroup'] as string | undefined;
    const returnByValue = params['returnByValue'] as boolean | undefined;

    try {
      // Build the evaluation scope
      const $0 = this.domHandler.inspectedNode;
      const scopeVars = {
        $0,
        window: this.window,
        document: this.document,
        terminal: this.terminalInstance,
        console: globalThis.console,
      };

      // Create a function with the scope variables as parameters
      const keys = Object.keys(scopeVars);
      const values = Object.values(scopeVars);
      const fn = new Function(...keys, `return (${expression})`);
      const result = fn(...values);

      if (returnByValue) {
        return {result: {type: typeof result, value: result}};
      }

      return {result: this.objectRegistry.serialize(result, objectGroup)};
    } catch (err) {
      const error = err as Error;
      return {
        result: this.objectRegistry.serialize(error, objectGroup),
        exceptionDetails: {
          exceptionId: 1,
          text: error.message,
          lineNumber: 0,
          columnNumber: 0,
          exception: this.objectRegistry.serialize(error, objectGroup),
        },
      };
    }
  }

  /**
   * `Runtime.getProperties` — returns own and inherited properties.
   */
  private getProperties(params: Record<string, unknown>): Record<string, unknown> {
    const objectId = params['objectId'] as string;
    const ownProperties = params['ownProperties'] as boolean | undefined;
    const obj = this.objectRegistry.getObject(objectId);

    if (!obj) {
      return {result: []};
    }

    const properties: Array<Record<string, unknown>> = [];
    const names = ownProperties ? Object.getOwnPropertyNames(obj) : getAllPropertyNames(obj);

    for (const name of names) {
      try {
        const descriptor =
          Object.getOwnPropertyDescriptor(obj, name) ?? getInheritedDescriptor(obj, name);
        if (!descriptor) continue;

        const entry: Record<string, unknown> = {
          name,
          configurable: descriptor.configurable ?? false,
          enumerable: descriptor.enumerable ?? false,
          isOwn: Object.prototype.hasOwnProperty.call(obj, name),
        };

        if ('value' in descriptor) {
          entry['value'] = this.objectRegistry.serialize(descriptor.value);
          entry['writable'] = descriptor.writable ?? false;
        }
        if (descriptor.get) {
          entry['get'] = this.objectRegistry.serialize(descriptor.get);
        }
        if (descriptor.set) {
          entry['set'] = this.objectRegistry.serialize(descriptor.set);
        }

        properties.push(entry);
      } catch {
        // Skip properties that throw on access
      }
    }

    return {result: properties};
  }

  /**
   * `Runtime.callFunctionOn` — calls a function with a given this and arguments.
   */
  private callFunctionOn(params: Record<string, unknown>): Record<string, unknown> {
    const functionDeclaration = params['functionDeclaration'] as string;
    const objectId = params['objectId'] as string | undefined;
    const callArguments = params['arguments'] as
      | Array<{value?: unknown; objectId?: string}>
      | undefined;
    const returnByValue = params['returnByValue'] as boolean | undefined;

    try {
      const thisObj = objectId ? this.objectRegistry.getObject(objectId) : globalThis;

      const args = (callArguments ?? []).map((arg) => {
        if (arg.objectId) {
          return this.objectRegistry.getObject(arg.objectId);
        }
        return arg.value;
      });

      const fn = new Function(`return (${functionDeclaration})`)();
      const result = fn.apply(thisObj, args);

      if (returnByValue) {
        return {result: {type: typeof result, value: result}};
      }

      return {result: this.objectRegistry.serialize(result)};
    } catch (err) {
      const error = err as Error;
      return {
        result: this.objectRegistry.serialize(error),
        exceptionDetails: {
          exceptionId: 1,
          text: error.message,
          lineNumber: 0,
          columnNumber: 0,
          exception: this.objectRegistry.serialize(error),
        },
      };
    }
  }

  /** `Runtime.releaseObject` — releases a single object. */
  private releaseObject(params: Record<string, unknown>): Record<string, unknown> {
    const objectId = params['objectId'] as string;
    this.objectRegistry.release(objectId);
    return {};
  }

  /** `Runtime.releaseObjectGroup` — releases all objects in a group. */
  private releaseObjectGroup(params: Record<string, unknown>): Record<string, unknown> {
    const objectGroup = params['objectGroup'] as string;
    this.objectRegistry.releaseGroup(objectGroup);
    return {};
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getAllPropertyNames(obj: object): string[] {
  const names = new Set<string>();
  let current: object | null = obj;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      names.add(name);
    }
    current = Object.getPrototypeOf(current);
  }
  return [...names];
}

function getInheritedDescriptor(obj: object, name: string): PropertyDescriptor | undefined {
  let current: object | null = Object.getPrototypeOf(obj);
  while (current) {
    const desc = Object.getOwnPropertyDescriptor(current, name);
    if (desc) return desc;
    current = Object.getPrototypeOf(current);
  }
  return undefined;
}
