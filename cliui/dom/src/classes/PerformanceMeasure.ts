import {PerformanceEntry} from './PerformanceEntry';

/**
 * A performance measure — a named duration between two points in the performance timeline.
 *
 * Follows the standard browser {@link https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMeasure | PerformanceMeasure} API.
 * The `entryType` is always `'measure'`.
 */
export class PerformanceMeasure extends PerformanceEntry {
  #detail: unknown;

  constructor(name: string, startTime: number, duration: number, detail?: unknown) {
    super(name, 'measure', startTime, duration);
    this.#detail = detail ?? null;
  }

  /** Optional metadata attached to this measure. */
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
