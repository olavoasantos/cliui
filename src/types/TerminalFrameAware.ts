/**
 * Contract for nodes that advance internal state in response to terminal frame ticks.
 */
export interface TerminalFrameAware {
  /**
   * Called by the terminal render loop with the current timestamp in milliseconds.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void;
}
