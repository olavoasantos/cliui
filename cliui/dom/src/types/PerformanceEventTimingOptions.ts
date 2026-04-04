/** Options for constructing a {@link PerformanceEventTiming} entry. */
export interface PerformanceEventTimingOptions {
  /** The event type name (e.g. `'keydown'`, `'click'`). */
  name: string;
  /** High-resolution timestamp when input bytes were received. */
  startTime: number;
  /** High-resolution timestamp when event handler execution began. */
  processingStart: number;
  /** High-resolution timestamp when event handler execution ended. */
  processingEnd: number;
  /**
   * Total duration from input received to next frame written.
   * Set to `0` initially; finalized after the next render frame completes.
   */
  duration: number;
  /** Unique identifier grouping related events in a single logical interaction. */
  interactionId: number;
  /**
   * Entry type: `'event'` for general interactions, `'first-input'` for the
   * first interaction.
   */
  entryType: 'event' | 'first-input';
}
