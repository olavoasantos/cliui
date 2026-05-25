import {Event} from './Event';

import type {AnimationEventInit} from '../types';

/**
 * DOM event dispatched during CSS animation lifecycle.
 *
 * Events: `animationstart`, `animationend`, `animationiteration`, `animationcancel`.
 * All bubble.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
 */
export class AnimationEvent extends Event {
  /** Name of the CSS animation. */
  readonly animationName: string;
  /** Seconds elapsed since the animation started. */
  readonly elapsedTime: number;
  /** Pseudo-element the animation runs on, or empty string. */
  readonly pseudoElement: string;

  /**
   * Creates an animation event.
   *
   * @param type - Event type string.
   * @param options - Optional init dict with `animationName`, `elapsedTime`, and `pseudoElement`.
   */
  constructor(type: string, options?: AnimationEventInit) {
    super(type, {bubbles: options?.bubbles ?? true, cancelable: options?.cancelable ?? false});
    this.animationName = options?.animationName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}
