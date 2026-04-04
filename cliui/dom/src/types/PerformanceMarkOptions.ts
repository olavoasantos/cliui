/** Options accepted by {@link Performance.mark}. */
export interface PerformanceMarkOptions {
  /** Optional metadata to attach to the mark. */
  detail?: unknown;
  /** Explicit start time (high-resolution timestamp). Defaults to `performance.now()`. */
  startTime?: number;
}
