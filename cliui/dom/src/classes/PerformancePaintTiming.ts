import {PerformanceEntry} from './PerformanceEntry';

/**
 * A paint timing entry for `first-contentful-paint`.
 *
 * Follows the standard browser {@link https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming | PerformancePaintTiming} API.
 * The `entryType` is always `'paint'`.
 */
export class PerformancePaintTiming extends PerformanceEntry {
  constructor(name: string, startTime: number) {
    super(name, 'paint', startTime, 0);
  }
}
