import {serializeCDPNode} from '../utilities/serializeCDPNode';

import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Element, Node as DomNode, Text, Window} from '@cliui/dom';
import type {Hooks} from '@cliui/dom';

/**
 * Finds the hooks object on a Window by looking for the Symbol with
 * description 'hooks'.  This avoids Symbol identity mismatches between
 * different copies of @cliui/dom (source vs dist).
 */
function getWindowHooks(window: Window): Partial<Hooks> {
  const symbols = Object.getOwnPropertySymbols(window);
  for (const sym of symbols) {
    if (sym.description === 'hooks') {
      return (window as any)[sym] as Partial<Hooks>;
    }
  }
  return {};
}

/**
 * Bridges DOM mutations from the hooks system to CDP DOM events.
 *
 * Installs itself by chaining onto the existing hooks on the window
 * (which are the Terminal's StyleEngine hooks). All existing hooks
 * fire first, then the CDP bridge emits events for tracked nodes.
 */
export class DOMMutationBridge {
  private readonly transport: CDPTransport;
  private readonly registry: NodeRegistry;
  private enabled = false;
  private installed = false;

  constructor(transport: CDPTransport, registry: NodeRegistry) {
    this.transport = transport;
    this.registry = registry;
  }

  /**
   * Installs CDP mutation hooks by chaining onto the existing window hooks.
   *
   * This preserves the Terminal's StyleEngine hooks — they fire first,
   * then the CDP bridge emits events.
   */
  install(window: Window): void {
    if (this.installed) return;
    this.installed = true;

    const hooks = getWindowHooks(window);

    const prevInsertChild = hooks.insertChild;
    const prevRemoveChild = hooks.removeChild;
    const prevSetAttribute = hooks.setAttribute;
    const prevRemoveAttribute = hooks.removeAttribute;
    const prevSetText = hooks.setText;

    hooks.insertChild = (parent: Element, node: Element | Text, index: number) => {
      prevInsertChild?.(parent, node, index);
      this.handleInsertChild(parent, node, index);
    };

    hooks.removeChild = (parent: Element, node: Element | Text, index: number) => {
      prevRemoveChild?.(parent, node, index);
      this.handleRemoveChild(parent, node);
    };

    hooks.setAttribute = (element: Element, name: string, value: string, ns?: string | null, oldValue?: string | null) => {
      prevSetAttribute?.(element, name, value, ns, oldValue);
      this.handleSetAttribute(element, name, value);
    };

    hooks.removeAttribute = (element: Element, name: string, ns?: string | null, oldValue?: string | null) => {
      prevRemoveAttribute?.(element, name, ns, oldValue);
      this.handleRemoveAttribute(element, name);
    };

    hooks.setText = (text: Text, data: string, oldValue?: string | null) => {
      prevSetText?.(text, data, oldValue);
      this.handleSetText(text, data);
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

  private handleInsertChild(parent: Element, node: Element | Text, index: number): void {
    if (!this.enabled) return;
    if (!this.registry.has(parent)) return;

    const parentNodeId = this.registry.getId(parent)!;

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
      params: {parentNodeId, previousNodeId, node: serialized},
    });
  }

  private handleRemoveChild(parent: Element, node: Element | Text): void {
    if (!this.enabled) return;
    if (!this.registry.has(parent)) return;

    const parentNodeId = this.registry.getId(parent)!;
    const nodeId = this.registry.getId(node);

    if (nodeId !== undefined) {
      this.transport.broadcastEvent({
        method: 'DOM.childNodeRemoved',
        params: {parentNodeId, nodeId},
      });
      this.registry.unregisterSubtree(node);
    }
  }

  private handleSetAttribute(element: Element, name: string, value: string): void {
    if (!this.enabled) return;
    if (!this.registry.has(element)) return;

    const nodeId = this.registry.getId(element)!;
    this.transport.broadcastEvent({
      method: 'DOM.attributeModified',
      params: {nodeId, name, value},
    });
  }

  private handleRemoveAttribute(element: Element, name: string): void {
    if (!this.enabled) return;
    if (!this.registry.has(element)) return;

    const nodeId = this.registry.getId(element)!;
    this.transport.broadcastEvent({
      method: 'DOM.attributeRemoved',
      params: {nodeId, name},
    });
  }

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
