import {PerformanceEntry} from './PerformanceEntry';

import type {PerformanceEventTimingOptions} from '../types';

/**
 * Extended performance entry for input responsiveness metrics (FID and INP).
 *
 * `startTime` is when input bytes were received, `processingStart` is when the
 * event handler began, `processingEnd` is when the handler returned, and
 * `duration` spans from input received to next frame written.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming
 */
export class PerformanceEventTiming extends PerformanceEntry {
  #processingStart: number;
  #processingEnd: number;
  #interactionId: number;

  constructor(options: PerformanceEventTimingOptions) {
    super(options.name, options.entryType, options.startTime, options.duration);
    this.#processingStart = options.processingStart;
    this.#processingEnd = options.processingEnd;
    this.#interactionId = options.interactionId;
  }

  /** High-resolution timestamp when event handler execution began. */
  get processingStart(): number {
    return this.#processingStart;
  }

  /** High-resolution timestamp when event handler execution ended. */
  get processingEnd(): number {
    return this.#processingEnd;
  }

  /** Unique identifier grouping related events in a single logical interaction. */
  get interactionId(): number {
    return this.#interactionId;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      processingStart: this.#processingStart,
      processingEnd: this.#processingEnd,
      interactionId: this.#interactionId,
    };
  }
}
