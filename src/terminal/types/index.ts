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
 * Minimal readable terminal input stream contract used by terminal infrastructure.
 */
export interface TerminalReadableInput extends TerminalInput {
  /**
   * Registers a listener for input chunks.
   *
   * @param event - Stream event name.
   * @param listener - Callback invoked for each chunk.
   * @returns The stream for chaining when supported.
   */
  on?(event: 'data', listener: (chunk: Buffer | string) => void): TerminalReadableInput;

  /**
   * Removes a previously registered listener.
   *
   * @param event - Stream event name.
   * @param listener - Previously registered callback.
   * @returns The stream for chaining when supported.
   */
  off?(event: 'data', listener: (chunk: Buffer | string) => void): TerminalReadableInput;
}

/**
 * Parsed key event emitted from terminal input.
 */
export interface TerminalKeyEvent {
  /** Discriminator for key events. */
  type: 'key';

  /** DOM-like key value. */
  key: string;

  /** DOM-like code value. */
  code: string;

  /** Whether the Control modifier is active. */
  ctrl: boolean;

  /** Whether the Alt modifier is active. */
  alt: boolean;

  /** Whether the Shift modifier is active. */
  shift: boolean;
}

/**
 * Parsed paste event emitted from bracketed paste mode.
 */
export interface TerminalPasteEvent {
  /** Discriminator for paste events. */
  type: 'paste';

  /** Raw pasted text content. */
  text: string;
}

/**
 * Union of parsed terminal input events.
 */
export type TerminalInputEvent = TerminalKeyEvent | TerminalPasteEvent;

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
