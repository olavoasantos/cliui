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
   * A function provided externally to look up layout box metrics for a node.
   * Set by the DevToolsBridge after the layout engine is available.
   */
  layoutLookup:
    | ((element: Element) => {
        x: number;
        y: number;
        width: number;
        height: number;
        contentX: number;
        contentY: number;
        contentWidth: number;
        contentHeight: number;
      } | null)
    | null = null;

  /** Returns the current layout root for hit-testing. */
  getLayoutRoot:
    | (() => {element: unknown; x: number; y: number; width: number; height: number; children: any[]} | null)
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
    this.transport.registerMethod('DOM.getBoxModel', (params) => this.getBoxModel(params));
    this.transport.registerMethod('DOM.markUndoableState', () => ({}));
    this.transport.registerMethod('DOM.getNodeForLocation', (params) =>
      this.getNodeForLocation(params),
    );
    this.transport.registerMethod('DOM.undo', () => ({}));
    this.transport.registerMethod('DOM.redo', () => ({}));
    this.transport.registerMethod('DOM.setAttributeValue', (params) =>
      this.setAttributeValue(params),
    );
    this.transport.registerMethod('DOM.setAttributesAsText', (params) =>
      this.setAttributesAsText(params),
    );
    this.transport.registerMethod('DOM.removeAttribute', (params) => this.removeAttribute(params));
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
        const children: ReturnType<typeof serializeCDPNode>[] = [];
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
      const html =
        typeof element.outerHTML === 'string' ? element.outerHTML : (element.textContent ?? '');
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

    // If we are replacing a specific attribute and it is not in the new text, remove it
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
      node.parentNode!.removeChild(node);
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
      (node as any).outerHTML = outerHTML;
    }

    return {};
  }

  /**
   * `DOM.getNodeForLocation` — returns the node at given pixel coordinates.
   *
   * DevTools sends this during inspect-element mode. Coordinates are in
   * pixels matching the screencast dimensions.
   */
  private getNodeForLocation(params: Record<string, unknown>): Record<string, unknown> {
    const x = params['x'] as number;
    const y = params['y'] as number;

    if (!this.getLayoutRoot) {
      return {backendNodeId: 0, frameId: 'terminal-dom-frame', nodeId: 0};
    }

    const root = this.getLayoutRoot();
    if (!root) {
      return {backendNodeId: 0, frameId: 'terminal-dom-frame', nodeId: 0};
    }

    // Convert pixel coordinates to cell coordinates
    const cellX = Math.floor(x / 8);
    const cellY = Math.floor(y / 16);

    // Two-pass hit-test: first exact match, then with 1-cell tolerance.
    // Terminal elements are often 1 cell tall with gaps between them,
    // making exact hits hard with a mouse.
    let best: Element | null = null;

    const walk = (box: any, tolerance: number): void => {
      if (
        cellX >= box.x - tolerance &&
        cellX < box.x + box.width + tolerance &&
        cellY >= box.y - tolerance &&
        cellY < box.y + box.height + tolerance
      ) {
        // Only accept Element nodes (nodeType 1), not text nodes
        if (box.element && (box.element as any).nodeType === 1) {
          best = box.element as Element;
        }
        if (box.children) {
          for (const child of box.children) walk(child, tolerance);
        }
      }
    };

    // Pass 1: exact match
    walk(root, 0);

    // Pass 2: if we only got a container (no leaf element), retry with tolerance
    if (best) {
      const bestChildren = (best as any).childNodes;
      const hasElementChildren = bestChildren && Array.from(bestChildren).some((c: any) => c.nodeType === 1);
      if (hasElementChildren) {
        // We hit a container — try again with tolerance to catch nearby children
        const containerBest = best;
        best = null;
        walk(root, 1);
        // If tolerance found a deeper element, use it; otherwise keep the container
        if (!best || best === containerBest) {
          best = containerBest;
        }
      }
    }

    if (best) {
      const nodeId = this.registry.register(best);

      // Ensure DevTools knows about this node and all its ancestors.
      // If the tree hasn't been expanded to this depth, DevTools
      // can't resolve the nodeId. Push ancestor chain via setChildNodes.
      this.ensureAncestorsRegistered(best);

      return {backendNodeId: nodeId, frameId: 'terminal-dom-frame', nodeId};
    }

    return {backendNodeId: 0, frameId: 'terminal-dom-frame', nodeId: 0};
  }

  /**
   * Ensures all ancestors of an element are registered in the node
   * registry and pushed to DevTools via `DOM.setChildNodes`.
   *
   * Without this, DevTools can't resolve nodeIds for elements in
   * unexpanded parts of the tree.
   */
  private ensureAncestorsRegistered(element: Element): void {
    // Collect the ancestor chain (bottom up)
    const chain: Element[] = [];
    let current: any = element;
    while (current && current.nodeType === 1) {
      chain.unshift(current);
      current = current.parentNode ?? current.parentElement;
    }

    // Walk top-down: for each ancestor, if its children aren't registered,
    // push them to DevTools
    for (const ancestor of chain) {
      const parentId = this.registry.getId(ancestor);
      if (parentId === undefined) {
        this.registry.register(ancestor);
      }

      const childNodes = ancestor.childNodes;
      if (!childNodes || childNodes.length === 0) continue;

      // Check if children are already registered
      let allRegistered = true;
      for (let i = 0; i < childNodes.length; i++) {
        if (!this.registry.has(childNodes[i])) {
          allRegistered = false;
          break;
        }
      }

      if (!allRegistered) {
        const children = [];
        for (let i = 0; i < childNodes.length; i++) {
          children.push(serializeCDPNode(childNodes[i], this.registry, 0));
        }
        this.transport.broadcastEvent({
          method: 'DOM.setChildNodes',
          params: {parentId: this.registry.getId(ancestor)!, nodes: children},
        });
      }
    }
  }

  /**
   * `DOM.getBoxModel` — returns the box model dimensions for a node.
   *
   * DevTools calls this constantly for element highlighting, tooltips,
   * and the box model diagram in the Styles pane.
   */
  private getBoxModel(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (!node || node.nodeType !== 1 || !this.layoutLookup) {
      // Return a zero-size box rather than failing — DevTools handles this gracefully
      const zero = [0, 0, 0, 0, 0, 0, 0, 0];
      return {
        model: {content: zero, padding: zero, border: zero, margin: zero, width: 0, height: 0},
      };
    }

    const box = this.layoutLookup(node);
    if (!box) {
      const zero = [0, 0, 0, 0, 0, 0, 0, 0];
      return {
        model: {content: zero, padding: zero, border: zero, margin: zero, width: 0, height: 0},
      };
    }

    // CDP box model uses four x,y corner pairs (8 numbers): top-left, top-right, bottom-right, bottom-left
    // Coordinates must be in pixels matching the screencast dimensions,
    // not terminal cells.  Cell size: 8px wide × 16px tall.
    const CW = 8;
    const CH = 16;
    const content = [
      box.contentX * CW,
      box.contentY * CH,
      (box.contentX + box.contentWidth) * CW,
      box.contentY * CH,
      (box.contentX + box.contentWidth) * CW,
      (box.contentY + box.contentHeight) * CH,
      box.contentX * CW,
      (box.contentY + box.contentHeight) * CH,
    ];
    const padding = content; // simplified: padding edge = content edge for now
    const border = [
      box.x * CW,
      box.y * CH,
      (box.x + box.width) * CW,
      box.y * CH,
      (box.x + box.width) * CW,
      (box.y + box.height) * CH,
      box.x * CW,
      (box.y + box.height) * CH,
    ];
    const margin = border; // simplified: margin edge = border edge for now

    return {
      model: {
        content,
        padding,
        border,
        margin,
        width: box.width * CW,
        height: box.height * CH,
      },
    };
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
  const listenersMap = (target as any)[LISTENERS] ?? findListenersMap(target);

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
