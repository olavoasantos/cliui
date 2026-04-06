import {serializeCDPNode} from '../utilities/serializeCDPNode';

import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Element, Node as DomNode, Text} from '@cliui/dom';
import type {Hooks} from '@cliui/dom';

/**
 * Bridges DOM mutations from the hooks system to CDP DOM events.
 *
 * When the terminal app mutates the DOM, the hooks bridge fires callbacks
 * for insertions, removals, attribute changes, and text changes.  This
 * class installs itself as an additional hooks consumer and emits the
 * corresponding CDP events so DevTools' Elements panel updates in real time.
 *
 * Events are only emitted for nodes that DevTools has already seen
 * (registered in the {@link NodeRegistry}) to avoid flooding DevTools
 * with events for unexpanded subtrees.
 */
export class DOMMutationBridge {
  private readonly transport: CDPTransport;
  private readonly registry: NodeRegistry;
  private enabled = false;

  /**
   * Creates a new DOM mutation bridge.
   *
   * @param transport - CDP transport for sending events.
   * @param registry  - Node registry for tracking which nodes DevTools knows about.
   */
  constructor(transport: CDPTransport, registry: NodeRegistry) {
    this.transport = transport;
    this.registry = registry;
  }

  /**
   * Returns a partial `Hooks` object that can be merged into the window hooks.
   *
   * The terminal application's hooks bridge supports multiple consumers.
   * These hook functions emit CDP events when appropriate.
   */
  createHooks(): Partial<Hooks> {
    return {
      insertChild: (parent: Element, node: Element | Text, index: number) => {
        this.handleInsertChild(parent, node, index);
      },
      removeChild: (parent: Element, node: Element | Text) => {
        this.handleRemoveChild(parent, node);
      },
      setAttribute: (element: Element, name: string, value: string) => {
        this.handleSetAttribute(element, name, value);
      },
      removeAttribute: (element: Element, name: string) => {
        this.handleRemoveAttribute(element, name);
      },
      setText: (text: Text, data: string) => {
        this.handleSetText(text, data);
      },
    };
  }

  /** Enables CDP event emission. */
  enable(): void {
    this.enabled = true;
  }

  /** Disables CDP event emission. */
  disable(): void {
    this.enabled = false;
  }

  /** Returns whether event emission is currently active. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Handles a child insertion.
   *
   * Emits `DOM.childNodeInserted` if the parent is tracked by DevTools.
   */
  private handleInsertChild(parent: Element, node: Element | Text, index: number): void {
    if (!this.enabled) return;
    if (!this.registry.has(parent)) return;

    const parentNodeId = this.registry.getId(parent)!;

    // Determine the previous sibling's node ID (0 if first child)
    let previousNodeId = 0;
    const childNodes = parent.childNodes;
    if (index > 0 && childNodes.length > index) {
      const prevSibling = childNodes[index - 1] as DomNode | undefined;
      if (prevSibling) {
        previousNodeId = this.registry.getId(prevSibling) ?? 0;
      }
    }

    const serialized = serializeCDPNode(node, this.registry, 0);

    this.transport.broadcastEvent({
      method: 'DOM.childNodeInserted',
      params: {
        parentNodeId,
        previousNodeId,
        node: serialized,
      },
    });
  }

  /**
   * Handles a child removal.
   *
   * Emits `DOM.childNodeRemoved` if the parent is tracked.
   * Cleans up the removed subtree from the registry.
   */
  private handleRemoveChild(parent: Element, node: Element | Text): void {
    if (!this.enabled) return;
    if (!this.registry.has(parent)) return;

    const parentNodeId = this.registry.getId(parent)!;
    const nodeId = this.registry.getId(node);

    if (nodeId !== undefined) {
      this.transport.broadcastEvent({
        method: 'DOM.childNodeRemoved',
        params: {
          parentNodeId,
          nodeId,
        },
      });

      // Clean up the removed subtree
      this.registry.unregisterSubtree(node);
    }
  }

  /**
   * Handles an attribute change.
   *
   * Emits `DOM.attributeModified` if the element is tracked.
   */
  private handleSetAttribute(element: Element, name: string, value: string): void {
    if (!this.enabled) return;
    if (!this.registry.has(element)) return;

    const nodeId = this.registry.getId(element)!;
    this.transport.broadcastEvent({
      method: 'DOM.attributeModified',
      params: {nodeId, name, value},
    });
  }

  /**
   * Handles an attribute removal.
   *
   * Emits `DOM.attributeRemoved` if the element is tracked.
   */
  private handleRemoveAttribute(element: Element, name: string): void {
    if (!this.enabled) return;
    if (!this.registry.has(element)) return;

    const nodeId = this.registry.getId(element)!;
    this.transport.broadcastEvent({
      method: 'DOM.attributeRemoved',
      params: {nodeId, name},
    });
  }

  /**
   * Handles a text content change.
   *
   * Emits `DOM.characterDataModified` if the text node is tracked.
   */
  private handleSetText(text: Text, data: string): void {
    if (!this.enabled) return;
    if (!this.registry.has(text)) return;

    const nodeId = this.registry.getId(text)!;
    this.transport.broadcastEvent({
      method: 'DOM.characterDataModified',
      params: {nodeId, characterData: data},
    });
  }
}
