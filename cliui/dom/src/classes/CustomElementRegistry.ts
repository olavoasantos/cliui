import {IS_CONNECTED, NodeType} from '../constants';
import type {CustomElementConstructor} from '../types';
import {ensureCustomElementStyles} from '../utilities/ensureCustomElementStyles';
import {selfAndDescendants} from '../utilities/selfAndDescendants';

import type {Element} from './Element';
import type {Node} from './Node';
import type {Window} from './Window';

/**
 * Registry for defining, retrieving, and upgrading custom elements.
 *
 * Exported as `CustomElementRegistry` from the package public API.
 */
export class CustomElementRegistryImplementation {
  private registry = new Map<string, CustomElementConstructor>();
  private listenersByName = new Map<string, ((Constructor: CustomElementConstructor) => void)[]>();
  private owner: Window | null = null;

  /**
   * Sets the owning window so `define()` can auto-upgrade existing elements.
   *
   * @internal
   * @param window - The owning Window instance.
   */
  setOwner(window: Window) {
    this.owner = window;
  }

  /**
   * Registers a custom element class for the given tag name.
   *
   * Auto-upgrades matching elements already in the document.
   *
   * @param name - The tag name to register.
   * @param Constructor - The custom element class constructor.
   * @throws {DOMException} When the name is already registered.
   */
  define(name: string, Constructor: CustomElementConstructor, _options?: ElementDefinitionOptions) {
    if (this.registry.has(name)) {
      throw new DOMException(
        `Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`,
      );
    }

    this.registry.set(name, Constructor);

    if (this.owner) {
      this.upgrade(this.owner.document);
    }

    const listeners = this.listenersByName.get(name);

    if (listeners == null) return;

    this.listenersByName.delete(name);

    for (const listener of listeners) {
      listener(Constructor);
    }
  }

  /**
   * Returns the constructor registered for a tag name, or `undefined`.
   *
   * @param name - The tag name to look up.
   * @returns The registered constructor, or `undefined` if not registered.
   */
  get(name: string) {
    return this.registry.get(name);
  }

  /**
   * Returns the tag name registered for a constructor, or `null`.
   *
   * @param Constructor - The constructor to look up.
   * @returns The registered tag name, or `null` if not registered.
   */
  getName(Constructor: CustomElementConstructor) {
    for (const [name, value] of this.registry) {
      if (value === Constructor) return name;
    }

    return null;
  }

  /**
   * Returns a Promise that resolves with the constructor when the tag name is registered.
   *
   * Resolves immediately if the tag name is already defined.
   *
   * @param name - The tag name to wait for.
   * @returns A Promise that resolves with the custom element constructor.
   */
  whenDefined(name: string) {
    const Constructor = this.registry.get(name);

    if (Constructor != null) return Promise.resolve(Constructor);

    let listeners = this.listenersByName.get(name);

    if (listeners == null) {
      listeners = [];
      this.listenersByName.set(name, listeners);
    }

    return new Promise<CustomElementConstructor>((resolve) => {
      listeners.push(resolve);
    });
  }

  /**
   * Walks a subtree and upgrades elements whose tag name matches a registered constructor.
   *
   * @param root - The root node of the subtree to upgrade.
   */
  upgrade(root: Node) {
    for (const node of selfAndDescendants(root)) {
      if (node.nodeType !== NodeType.ELEMENT_NODE) continue;

      const element = node as Element;
      const Constructor = this.registry.get(element.localName);

      if (Constructor == null || element instanceof Constructor) continue;

      Object.setPrototypeOf(element, Constructor.prototype);

      if (element[IS_CONNECTED]) {
        ensureCustomElementStyles(element);
        (element as unknown as {connectedCallback?(): void}).connectedCallback?.();
      }
    }
  }
}
