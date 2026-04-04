/** Union of all terminal vital metric names. */
export type TerminalVitalsMetricName =
  | 'first-contentful-paint'
  | 'largest-contentful-paint'
  | 'interaction-to-next-paint'
  | 'input-dispatch-latency'
  | 'dropped-frames'
  | 'frame-budget-utilization'
  | 'idle-frame-ratio'
  | 'dirty-element-ratio'
  | 'frame-output-size';

/** A single metric report delivered by {@link TerminalVitals}. */
export interface TerminalVitalsMetric {
  /** The metric identifier. */
  name: TerminalVitalsMetricName;
  /** The computed value for this metric. */
  value: number;
}

/** Callback invoked by {@link TerminalVitals.onMetric}. */
export type TerminalVitalsCallback = (metric: TerminalVitalsMetric) => void;
