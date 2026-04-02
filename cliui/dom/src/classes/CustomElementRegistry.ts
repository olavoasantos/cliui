import {IS_CONNECTED, NodeType} from '../constants';
import type {CustomElementConstructor} from '../types';
import {ensureCustomElementStyles} from '../utilities/ensureCustomElementStyles';
import {selfAndDescendants} from '../utilities/selfAndDescendants';

import type {Element} from './Element';
import type {Node} from './Node';
import type {Window} from './Window';

export class CustomElementRegistryImplementation {
  private registry = new Map<string, CustomElementConstructor>();
  private listenersByName = new Map<string, ((Constructor: CustomElementConstructor) => void)[]>();
  private owner: Window | null = null;

  /** @internal Sets the owning window so define() can auto-upgrade existing elements. */
  setOwner(window: Window) {
    this.owner = window;
  }

  define(name: string, Constructor: CustomElementConstructor, _options?: ElementDefinitionOptions) {
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

  get(name: string) {
    return this.registry.get(name);
  }

  getName(Constructor: CustomElementConstructor) {
    for (const [name, value] of this.registry) {
      if (value === Constructor) return name;
    }

    return null;
  }

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
