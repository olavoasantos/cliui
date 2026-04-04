import {Event} from './Event';

import type {AnimationEventInit} from '../types/AnimationEventInit';

/**
 * DOM event dispatched during CSS animation lifecycle.
 *
 * Events: `animationstart`, `animationend`, `animationiteration`, `animationcancel`.
 * All bubble.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
 */
export class AnimationEvent extends Event {
  readonly animationName: string;
  readonly elapsedTime: number;
  readonly pseudoElement: string;

  constructor(type: string, options?: AnimationEventInit) {
    super(type, {bubbles: options?.bubbles ?? true, cancelable: options?.cancelable ?? false});
    this.animationName = options?.animationName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}
