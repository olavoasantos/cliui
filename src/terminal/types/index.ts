/**
 * Minimal writable stream contract used by terminal infrastructure.
 */
export interface TerminalOutput {
  /**
   * Writes terminal control bytes or text to the output stream.
   *
   * @param chunk - Escape sequences or content to write.
   * @returns Whether the chunk was accepted by the stream.
   */
  write(chunk: string): boolean;
}

/**
 * Minimal raw-mode capable input stream contract used by terminal infrastructure.
 */
export interface TerminalInput {
  /**
   * Enables or disables terminal raw mode when supported by the stream.
   *
   * @param enabled - Whether raw mode should be active.
   */
  setRawMode?(enabled: boolean): void;
}

/**
 * Configuration for terminal mode lifecycle management.
 */
export interface TerminalManagerOptions {
  /** Input stream that may support raw mode. */
  input: TerminalInput;

  /** Output stream that receives terminal escape sequences. */
  output: TerminalOutput;

  /** Whether to use the terminal alternate screen buffer. */
  altScreen?: boolean;

  /** Whether to enable mouse reporting mode 1006. */
  mouse?: boolean;
}
