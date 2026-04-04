/** Options accepted by {@link PerformanceObserver.observe}. */
export interface PerformanceObserverObserveOptions {
  /** Subscribe to multiple entry types at once. */
  entryTypes?: string[];
  /** Subscribe to a single entry type. */
  type?: string;
}
