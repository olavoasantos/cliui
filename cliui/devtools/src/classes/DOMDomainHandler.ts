import {serializeCDPNode} from '../utilities/serializeCDPNode';

import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Document, Element, EventTarget, Node as DomNode} from '@cliui/dom';

/**
 * CDP DOM domain handler for tree inspection.
 *
 * Populates DevTools' Elements panel with the document tree, supports
 * lazy child loading, selector queries, outer HTML retrieval, and
 * event listener inspection.
 */
export class DOMDomainHandler {
  private readonly transport: CDPTransport;
  private readonly registry: NodeRegistry;
  private readonly document: Document;

  /** The most recently inspected node, accessible as `$0` in the console. */
  inspectedNode: Element | null = null;

  /**
   * A function provided externally to resolve a DOM node to a Runtime
   * RemoteObject.  Set by the DevToolsBridge after the Runtime domain is
   * initialized.
   */
  resolveNodeToRemoteObject:
    | ((node: DomNode) => {type: string; subtype?: string; objectId?: string; description?: string})
    | null = null;

  /**
   * Creates a new DOM domain handler.
   *
   * @param transport - CDP transport for sending responses and events.
   * @param registry  - Node registry for ID assignment and lookup.
   * @param document  - The DOM document to inspect.
   */
  constructor(transport: CDPTransport, registry: NodeRegistry, document: Document) {
    this.transport = transport;
    this.registry = registry;
    this.document = document;
  }

  /**
   * Registers all DOM domain method handlers with the transport.
   */
  register(): void {
    this.transport.registerMethod('DOM.enable', () => this.enable());
    this.transport.registerMethod('DOM.disable', () => ({}));
    this.transport.registerMethod('DOM.getDocument', (params) => this.getDocument(params));
    this.transport.registerMethod('DOM.requestChildNodes', (params) =>
      this.requestChildNodes(params),
    );
    this.transport.registerMethod('DOM.querySelector', (params) => this.querySelector(params));
    this.transport.registerMethod('DOM.querySelectorAll', (params) =>
      this.querySelectorAll(params),
    );
    this.transport.registerMethod('DOM.getOuterHTML', (params) => this.getOuterHTML(params));
    this.transport.registerMethod('DOM.resolveNode', (params) => this.resolveNode(params));
    this.transport.registerMethod('DOM.setInspectedNode', (params) =>
      this.setInspectedNode(params),
    );
    this.transport.registerMethod('DOM.setAttributeValue', (params) =>
      this.setAttributeValue(params),
    );
    this.transport.registerMethod('DOM.setAttributesAsText', (params) =>
      this.setAttributesAsText(params),
    );
    this.transport.registerMethod('DOM.removeAttribute', (params) =>
      this.removeAttribute(params),
    );
    this.transport.registerMethod('DOM.removeNode', (params) => this.removeNode(params));
    this.transport.registerMethod('DOM.setNodeValue', (params) => this.setNodeValue(params));
    this.transport.registerMethod('DOM.setOuterHTML', (params) => this.setOuterHTML(params));
    this.transport.registerMethod('DOMDebugger.getEventListeners', (params) =>
      this.getEventListeners(params),
    );
  }

  /**
   * `DOM.enable` — initializes the domain.
   */
  private enable(): Record<string, unknown> {
    return {};
  }

  /**
   * `DOM.getDocument` — returns the serialized document tree.
   */
  private getDocument(params: Record<string, unknown>): Record<string, unknown> {
    const depth = typeof params['depth'] === 'number' ? (params['depth'] as number) : 2;
    const root = serializeCDPNode(this.document, this.registry, depth);
    return {root};
  }

  /**
   * `DOM.requestChildNodes` — loads children asynchronously.
   *
   * CDP requires children to be sent via `DOM.setChildNodes` event,
   * not in the response.
   */
  private requestChildNodes(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const depth = typeof params['depth'] === 'number' ? (params['depth'] as number) : 1;
    const node = this.registry.getNode(nodeId);

    if (node) {
      const childNodes = (node as any).childNodes;
      if (childNodes && childNodes.length > 0) {
        const children = [];
        for (let i = 0; i < childNodes.length; i++) {
          children.push(serializeCDPNode(childNodes[i], this.registry, depth - 1));
        }
        // Send children asynchronously via event
        queueMicrotask(() => {
          this.transport.broadcastEvent({
            method: 'DOM.setChildNodes',
            params: {parentId: nodeId, nodes: children},
          });
        });
      }
    }

    return {};
  }

  /**
   * `DOM.querySelector` — executes a selector query and returns the first match.
   */
  private querySelector(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const selector = params['selector'] as string;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (node && typeof node.querySelector === 'function') {
      const match = node.querySelector(selector);
      if (match) {
        return {nodeId: this.registry.register(match)};
      }
    }

    return {nodeId: 0};
  }

  /**
   * `DOM.querySelectorAll` — executes a selector query and returns all matches.
   */
  private querySelectorAll(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const selector = params['selector'] as string;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (node && typeof node.querySelectorAll === 'function') {
      const matches = node.querySelectorAll(selector);
      const nodeIds = [];
      for (let i = 0; i < matches.length; i++) {
        nodeIds.push(this.registry.register(matches[i] as Element));
      }
      return {nodeIds};
    }

    return {nodeIds: []};
  }

  /**
   * `DOM.getOuterHTML` — returns the serialized HTML of a node.
   */
  private getOuterHTML(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId);

    if (node) {
      // Use the node's outerHTML if available (Element), otherwise textContent
      const element = node as any;
      const html = typeof element.outerHTML === 'string' ? element.outerHTML : (element.textContent ?? '');
      return {outerHTML: html};
    }

    return {outerHTML: ''};
  }

  /**
   * `DOM.resolveNode` — returns a Runtime remote object for a node.
   */
  private resolveNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId);

    if (node && this.resolveNodeToRemoteObject) {
      return {object: this.resolveNodeToRemoteObject(node)};
    }

    // Fallback: return a basic remote object
    if (node) {
      return {
        object: {
          type: 'object',
          subtype: 'node',
          description: node.nodeName,
          objectId: String(nodeId),
        },
      };
    }

    return {object: {type: 'undefined'}};
  }

  /**
   * `DOM.setInspectedNode` — tracks the currently inspected node for `$0`.
   */
  private setInspectedNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId);

    if (node && node.nodeType === 1) {
      this.inspectedNode = node as Element;
    }

    return {};
  }

  /**
   * `DOM.setAttributeValue` — sets an attribute on an element.
   */
  private setAttributeValue(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const name = params['name'] as string;
    const value = params['value'] as string;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (node && typeof node.setAttribute === 'function') {
      node.setAttribute(name, value);
    }

    return {};
  }

  /**
   * `DOM.setAttributesAsText` — parses a raw attribute string and applies it.
   *
   * DevTools sends attributes as a single string when editing in the Elements
   * panel, e.g. `'class="btn" id="main"'`.
   */
  private setAttributesAsText(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const text = params['text'] as string;
    const nameToRemove = params['name'] as string | undefined;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (!node || typeof node.setAttribute !== 'function') {
      return {};
    }

    // If text is empty and we have a name, remove that attribute
    if (!text && nameToRemove) {
      node.removeAttribute(nameToRemove);
      return {};
    }

    // Parse key="value" pairs from the text
    const parsed = parseAttributeString(text);

    // If we're replacing a specific attribute and it's not in the new text, remove it
    if (nameToRemove && !parsed.has(nameToRemove)) {
      node.removeAttribute(nameToRemove);
    }

    for (const [name, value] of parsed) {
      node.setAttribute(name, value);
    }

    return {};
  }

  /**
   * `DOM.removeAttribute` — removes an attribute from an element.
   */
  private removeAttribute(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const name = params['name'] as string;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (node && typeof node.removeAttribute === 'function') {
      node.removeAttribute(name);
    }

    return {};
  }

  /**
   * `DOM.removeNode` — removes a node from the DOM tree.
   */
  private removeNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId);

    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }

    return {};
  }

  /**
   * `DOM.setNodeValue` — sets the value of a text or comment node.
   */
  private setNodeValue(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const value = params['value'] as string;
    const node = this.registry.getNode(nodeId);

    if (node) {
      node.nodeValue = value;
    }

    return {};
  }

  /**
   * `DOM.setOuterHTML` — replaces a node's outer HTML.
   */
  private setOuterHTML(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const outerHTML = params['outerHTML'] as string;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (node && typeof node.outerHTML === 'string') {
      node.outerHTML = outerHTML;
    }

    return {};
  }

  /**
   * `DOMDebugger.getEventListeners` — returns attached event listeners.
   *
   * Reads the internal `LISTENERS` map from `EventTarget` to expose
   * attached listeners in DevTools.
   */
  private getEventListeners(params: Record<string, unknown>): Record<string, unknown> {
    const objectId = params['objectId'] as string | undefined;
    const nodeId = objectId ? parseInt(objectId, 10) : undefined;
    const node = nodeId !== undefined ? this.registry.getNode(nodeId) : undefined;

    if (!node) {
      return {listeners: []};
    }

    const listeners = getNodeEventListeners(node as unknown as EventTarget);
    return {listeners};
  }
}

// ── Utilities ────────────────────────────────────────────────────────

const LISTENERS = Symbol.for('listeners');
const CAPTURE_MARKER = '@';

/**
 * Parses a raw attribute string like `'class="btn" id="main"'`
 * into a Map of name → value pairs.
 */
function parseAttributeString(text: string): Map<string, string> {
  const result = new Map<string, string>();
  // Match name="value" or name='value' or name=value or standalone name
  const regex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    result.set(name, value);
  }

  return result;
}

/**
 * Reads attached event listeners from an EventTarget's internal LISTENERS map.
 */
function getNodeEventListeners(
  target: EventTarget,
): Array<{type: string; useCapture: boolean; handler: string}> {
  const listeners: Array<{type: string; useCapture: boolean; handler: string}> = [];

  // Access the internal listeners map via the LISTENERS symbol
  // The @cliui/dom EventTarget uses Symbol('listeners'), we try multiple access patterns
  const listenersMap =
    (target as any)[LISTENERS] ?? findListenersMap(target);

  if (!listenersMap || !(listenersMap instanceof Map)) {
    return listeners;
  }

  for (const [key, set] of listenersMap.entries()) {
    const capture = (key as string).endsWith(CAPTURE_MARKER);
    const type = capture ? (key as string).slice(0, -1) : (key as string);

    if (set instanceof Set) {
      for (const listener of set) {
        const handler =
          typeof listener === 'function'
            ? listener.toString().slice(0, 100)
            : typeof listener?.handleEvent === 'function'
              ? listener.handleEvent.toString().slice(0, 100)
              : 'unknown';

        listeners.push({type, useCapture: capture, handler});
      }
    }
  }

  return listeners;
}

/**
 * Attempts to find the LISTENERS map via symbol property enumeration.
 */
function findListenersMap(target: unknown): Map<string, Set<unknown>> | null {
  const symbols = Object.getOwnPropertySymbols(target);
  for (const sym of symbols) {
    if (sym.description === 'listeners') {
      const value = (target as any)[sym];
      if (value instanceof Map) {
        return value;
      }
    }
  }
  return null;
}
