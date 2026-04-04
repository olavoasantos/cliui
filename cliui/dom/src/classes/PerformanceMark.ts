import {PerformanceEntry} from './PerformanceEntry';

import type {PerformanceMarkOptions} from '../types/PerformanceMarkOptions';

/**
 * A performance mark — a named timestamp in the performance timeline.
 *
 * Follows the standard browser {@link https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMark | PerformanceMark} API.
 * The `entryType` is always `'mark'`.
 */
export class PerformanceMark extends PerformanceEntry {
  #detail: unknown;

  constructor(name: string, options?: PerformanceMarkOptions) {
    super(name, 'mark', options?.startTime ?? 0, 0);
    this.#detail = options?.detail ?? null;
  }

  /** Optional metadata attached to this mark. */
  get detail(): unknown {
    return this.#detail;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      detail: this.#detail,
    };
  }
}
