import type {Window} from '../classes/Window';
import type {MutationObserverStore} from '../types';

/** Internal per-window store for mutation observer infrastructure. */
export const MUTATION_OBSERVER_STORES = new WeakMap<Window, MutationObserverStore>();
