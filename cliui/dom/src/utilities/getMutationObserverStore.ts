import {MUTATION_OBSERVER_STORES} from '../constants/mutationObserverStores';

import type {Window} from '../classes/Window';
import type {MutationObserverStore} from '../types/MutationObserverStore';

/**
 * Retrieves or creates the per-window mutation observer store.
 */
export function getMutationObserverStore(window: Window): MutationObserverStore {
  let store = MUTATION_OBSERVER_STORES.get(window);

  if (store === undefined) {
    store = {
      installed: false,
      observers: new Set(),
    };
    MUTATION_OBSERVER_STORES.set(window, store);
  }

  return store;
}
