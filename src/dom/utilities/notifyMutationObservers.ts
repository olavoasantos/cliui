import {getMutationObserverStore} from './getMutationObserverStore';

import type {Window} from '../classes/Window';
import type {MutationRecord} from '../types';

/**
 * Delivers a mutation record to all registered observers for the window.
 */
export function notifyMutationObservers(window: Window, record: MutationRecord): void {
  const store = getMutationObserverStore(window);

  for (const observer of store.observers) {
    observer.enqueue(record);
  }
}
