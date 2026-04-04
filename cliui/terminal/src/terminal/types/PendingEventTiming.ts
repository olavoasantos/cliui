import type {PerformanceEventTimingOptions} from '@cliui/dom';

/**
 * Tracks in-progress input event timings that are waiting for the next
 * render frame to finalize their `duration`.
 *
 * Created by `EventDispatcher` during input dispatch, finalized by
 * `Terminal` after the next `renderFrame()` completes.
 */
export interface PendingEventTiming {
  /** Partial options — `duration` is 0 until finalized. */
  options: PerformanceEventTimingOptions;
  /** Whether this is the very first dispatched interaction. */
  isFirstInput: boolean;
}
