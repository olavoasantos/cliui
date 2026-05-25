import {Event} from './Event';

import type {TransitionEventInit} from '../types';

/**
 * DOM event dispatched during CSS transition lifecycle.
 *
 * Events: `transitionrun`, `transitionstart`, `transitionend`, `transitioncancel`.
 * All bubble.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
 */
export class TransitionEvent extends Event {
  /** CSS property name that transitioned. */
  readonly propertyName: string;
  /** Seconds elapsed since the transition started. */
  readonly elapsedTime: number;
  /** Pseudo-element the transition runs on, or empty string. */
  readonly pseudoElement: string;

  /**
   * Creates a transition event.
   *
   * @param type - Event type string.
   * @param options - Optional init dict with `propertyName`, `elapsedTime`, and `pseudoElement`.
   */
  constructor(type: string, options?: TransitionEventInit) {
    super(type, {bubbles: options?.bubbles ?? true, cancelable: options?.cancelable ?? false});
    this.propertyName = options?.propertyName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}
