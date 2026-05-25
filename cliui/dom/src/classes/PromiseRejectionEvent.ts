import {Event} from './Event';
import type {PromiseRejectionEventInit} from '../types';

/**
 * Event dispatched when a Promise is rejected without a handler (`unhandledrejection`).
 */
export class PromiseRejectionEvent extends Event {
  /** Promise that was rejected. */
  readonly promise: Promise<unknown>;
  /** Rejection reason passed to `reject()`. */
  readonly reason: unknown;

  /**
   * Creates a promise rejection event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Init dict with the rejected promise and reason.
   */
  constructor(type: string, eventInitDict: PromiseRejectionEventInit) {
    super(type, eventInitDict);

    this.promise = eventInitDict.promise;
    this.reason = eventInitDict.reason;
  }
}
