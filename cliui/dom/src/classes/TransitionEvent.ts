import {Event} from './Event';

import type {TransitionEventInit} from '../types/TransitionEventInit';

/**
 * DOM event dispatched during CSS transition lifecycle.
 *
 * Events: `transitionrun`, `transitionstart`, `transitionend`, `transitioncancel`.
 * All bubble.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
 */
export class TransitionEvent extends Event {
  readonly propertyName: string;
  readonly elapsedTime: number;
  readonly pseudoElement: string;

  constructor(type: string, options?: TransitionEventInit) {
    super(type, {bubbles: options?.bubbles ?? true, cancelable: options?.cancelable ?? false});
    this.propertyName = options?.propertyName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}
