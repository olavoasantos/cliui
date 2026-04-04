/** Union of all terminal vital metric names. */
export type TerminalVitalsMetricName =
  | 'dropped-frames'
  | 'frame-budget-utilization'
  | 'idle-frame-ratio'
  | 'dirty-element-ratio'
  | 'frame-output-size'
  | 'input-dispatch-latency'
  | 'inp'
  | 'fcp'
  | 'lcp';

/** A single metric report delivered by {@link TerminalVitals}. */
export interface TerminalVitalsMetric {
  /** The metric identifier. */
  name: TerminalVitalsMetricName;
  /** The computed value for this metric. */
  value: number;
}

/** Callback invoked by {@link TerminalVitals.onMetric}. */
export type TerminalVitalsCallback = (metric: TerminalVitalsMetric) => void;
