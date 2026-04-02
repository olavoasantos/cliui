import type {MutationObserver} from '../classes/MutationObserver';

/** Per-window store tracking installed mutation observer hooks. */
export interface MutationObserverStore {
  installed: boolean;
  observers: Set<MutationObserver>;
}
