import {HOOKS} from '../constants';

import type {Element} from './Element';
import type {Node} from './Node';
import type {Text} from './Text';
import type {Window} from './Window';
import type {Hooks, MutationObserverInit, MutationRecord} from '../types';

interface MutationObserverStore {
  installed: boolean;
  observers: Set<MutationObserver>;
}

interface Observation {
  target: Node;
  options: MutationObserverInit;
}

const stores = new WeakMap<Window, MutationObserverStore>();

/**
 * Observes DOM mutations and delivers batched mutation records in a microtask.
 */
export class MutationObserver {
  private readonly callback: (records: MutationRecord[], observer: MutationObserver) => void;
  private readonly observations: Observation[] = [];
  private readonly records: MutationRecord[] = [];
  private scheduled = false;
  private window: Window | null = null;

  /**
   * Creates a new mutation observer.
   *
   * @param callback - Invoked with batched mutation records.
   */
  constructor(callback: (records: MutationRecord[], observer: MutationObserver) => void) {
    this.callback = callback;
  }

  /**
   * Starts observing a target node.
   *
   * @param target - The node to observe.
   * @param options - Mutation types and subtree behavior to observe.
   */
  observe(target: Node, options: MutationObserverInit): void {
    const normalized = this.normalizeOptions(options);

    this.window = target.ownerDocument.defaultView;
    this.installHooks(this.window);

    const existing = this.observations.find((observation) => observation.target === target);

    if (existing) {
      existing.options = normalized;
    } else {
      this.observations.push({target, options: normalized});
    }

    getStore(this.window).observers.add(this);
  }

  /**
   * Stops observing all targets.
   */
  disconnect(): void {
    this.observations.length = 0;

    if (this.window !== null) {
      getStore(this.window).observers.delete(this);
    }
  }

  /**
   * Returns and clears all pending mutation records.
   */
  takeRecords(): MutationRecord[] {
    return this.records.splice(0, this.records.length);
  }

  enqueue(record: MutationRecord): void {
    for (const observation of this.observations) {
      if (!this.matchesObservation(record, observation)) {
        continue;
      }

      this.records.push(this.cloneRecord(record, observation.options));
    }

    if (this.records.length > 0 && !this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        const records = this.takeRecords();

        if (records.length > 0) {
          this.callback(records, this);
        }
      });
    }
  }

  private normalizeOptions(options: MutationObserverInit): MutationObserverInit {
    const normalized = {...options};

    if (normalized.attributeOldValue === true && normalized.attributes === undefined) {
      normalized.attributes = true;
    }

    if (normalized.characterDataOldValue === true && normalized.characterData === undefined) {
      normalized.characterData = true;
    }

    if (
      normalized.childList !== true &&
      normalized.attributes !== true &&
      normalized.characterData !== true
    ) {
      throw new TypeError(
        "Failed to execute 'observe' on 'MutationObserver': at least one mutation type must be observed.",
      );
    }

    return normalized;
  }

  private installHooks(window: Window): void {
    const store = getStore(window);

    if (store.installed) {
      return;
    }

    store.installed = true;

    const hooks = window[HOOKS] as Partial<Hooks>;
    const previousSetAttribute = hooks.setAttribute;
    const previousRemoveAttribute = hooks.removeAttribute;
    const previousSetText = hooks.setText;
    const previousInsertChild = hooks.insertChild;
    const previousRemoveChild = hooks.removeChild;

    hooks.setAttribute = (element, name, value, ns, oldValue) => {
      previousSetAttribute?.(element, name, value, ns, oldValue);
      notifyObservers(window, {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: name,
        oldValue: oldValue ?? null,
      });
    };

    hooks.removeAttribute = (element, name, ns, oldValue) => {
      previousRemoveAttribute?.(element, name, ns, oldValue);
      notifyObservers(window, {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: name,
        oldValue: oldValue ?? null,
      });
    };

    hooks.setText = (text, data, oldValue) => {
      previousSetText?.(text, data, oldValue);
      notifyObservers(window, {
        type: 'characterData',
        target: text,
        addedNodes: [],
        removedNodes: [],
        attributeName: null,
        oldValue: oldValue ?? null,
      });
    };

    hooks.insertChild = (parent, node, index) => {
      previousInsertChild?.(parent, node, index);
      notifyObservers(window, {
        type: 'childList',
        target: parent,
        addedNodes: [node],
        removedNodes: [],
        attributeName: null,
        oldValue: null,
      });
    };

    hooks.removeChild = (parent, node, index) => {
      previousRemoveChild?.(parent, node, index);
      notifyObservers(window, {
        type: 'childList',
        target: parent,
        addedNodes: [],
        removedNodes: [node],
        attributeName: null,
        oldValue: null,
      });
    };
  }

  private matchesObservation(record: MutationRecord, observation: Observation): boolean {
    if (
      !this.isObservedTarget(
        record.target,
        observation.target,
        observation.options.subtree === true,
      )
    ) {
      return false;
    }

    switch (record.type) {
      case 'attributes':
        if (observation.options.attributes !== true) {
          return false;
        }

        if (
          observation.options.attributeFilter !== undefined &&
          record.attributeName !== null &&
          !observation.options.attributeFilter.includes(record.attributeName)
        ) {
          return false;
        }

        return true;
      case 'characterData':
        return observation.options.characterData === true;
      case 'childList':
        return observation.options.childList === true;
    }
  }

  private isObservedTarget(
    target: Node | Element | Text,
    observedTarget: Node,
    subtree: boolean,
  ): boolean {
    if (target === observedTarget) {
      return true;
    }

    if (!subtree) {
      return false;
    }

    let parent = target.parentNode;

    while (parent !== null) {
      if (parent === observedTarget) {
        return true;
      }

      parent = parent.parentNode;
    }

    return false;
  }

  private cloneRecord(record: MutationRecord, options: MutationObserverInit): MutationRecord {
    return {
      type: record.type,
      target: record.target,
      addedNodes: [...record.addedNodes],
      removedNodes: [...record.removedNodes],
      attributeName: record.attributeName,
      oldValue: this.resolveOldValue(record, options),
    };
  }

  private resolveOldValue(record: MutationRecord, options: MutationObserverInit): string | null {
    if (record.type === 'attributes') {
      return options.attributeOldValue === true ? record.oldValue : null;
    }

    if (record.type === 'characterData') {
      return options.characterDataOldValue === true ? record.oldValue : null;
    }

    return null;
  }
}

function getStore(window: Window): MutationObserverStore {
  let store = stores.get(window);

  if (store === undefined) {
    store = {
      installed: false,
      observers: new Set(),
    };
    stores.set(window, store);
  }

  return store;
}

function notifyObservers(window: Window, record: MutationRecord): void {
  const store = getStore(window);

  for (const observer of store.observers) {
    observer.enqueue(record);
  }
}
