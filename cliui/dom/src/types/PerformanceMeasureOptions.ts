/** Options accepted by {@link Performance.measure}. */
export interface PerformanceMeasureOptions {
  /** Optional metadata to attach to the measure. */
  detail?: unknown;
  /** Start mark name or timestamp. */
  start?: string | number;
  /** End mark name or timestamp. */
  end?: string | number;
  /** Explicit duration override. */
  duration?: number;
}
