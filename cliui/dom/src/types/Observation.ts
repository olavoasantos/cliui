import type {Node} from '../classes/Node';
import type {MutationObserverInit} from '../types';

/** Internal state for a MutationObserver's single observation target. */
export interface Observation {
  target: Node;
  options: MutationObserverInit;
}
