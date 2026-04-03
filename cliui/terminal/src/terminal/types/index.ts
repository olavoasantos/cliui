/**
 * Minimal writable stream contract used by terminal infrastructure.
 */
export interface TerminalOutput {
  /** Current terminal width in columns, when known. */
  columns?: number;

  /** Current terminal height in rows, when known. */
  rows?: number;

  /**
   * Returns the terminal color depth in bits when the stream can report it.
   */
  getColorDepth?(): number;

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

  /**
   * Registers a listener for terminal response chunks when supported.
   */
  on?(event: 'data', listener: (chunk: Buffer | string) => void): TerminalInput | void;

  /**
   * Removes a previously registered terminal response listener when supported.
   */
  off?(event: 'data', listener: (chunk: Buffer | string) => void): TerminalInput | void;
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

  /**
   * Resumes the readable stream when supported.
   */
  resume?(): void;

  /**
   * Pauses the readable stream when supported.
   */
  pause?(): void;
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
 * Supported terminal mouse buttons decoded from SGR mouse reporting.
 */
export type TerminalMouseButton =
  | 'none'
  | 'left'
  | 'middle'
  | 'right'
  | 'wheel-up'
  | 'wheel-down'
  | 'wheel-left'
  | 'wheel-right'
  | 'backward'
  | 'forward'
  | 'button10'
  | 'button11';

/**
 * Supported terminal mouse event kinds decoded from SGR mouse reporting.
 */
export type TerminalMouseEventType = 'press' | 'release' | 'motion' | 'wheel';

/**
 * Parsed mouse event emitted from SGR mouse reporting mode.
 */
export interface TerminalMouseEvent {
  /** Discriminator for mouse events. */
  type: 'mouse';

  /** The decoded mouse event kind. */
  eventType: TerminalMouseEventType;

  /** The decoded terminal mouse button. */
  button: TerminalMouseButton;

  /** Zero-based terminal column. */
  column: number;

  /** Zero-based terminal row. */
  row: number;

  /** Whether the Control modifier is active. */
  ctrl: boolean;

  /** Whether the Alt modifier is active. */
  alt: boolean;

  /** Whether the Shift modifier is active. */
  shift: boolean;
}

/**
 * Parsed terminal focus event emitted from focus reporting mode.
 */
export interface TerminalFocusEvent {
  /** Discriminator for focus events. */
  type: 'focus';

  /** Whether terminal focus was gained or lost. */
  focus: 'in' | 'out';
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
export type TerminalInputEvent =
  | TerminalKeyEvent
  | TerminalMouseEvent
  | TerminalFocusEvent
  | TerminalPasteEvent;

/**
 * Supported terminal color capability levels.
 */
export type TerminalColorProfile = 'truecolor' | 'ansi256' | 'ansi16' | 'none';

/**
 * Supported terminal graphics protocol capability levels.
 */
export type TerminalGraphicsProtocol = 'kitty' | 'iterm2' | 'none';

/**
 * Detected terminal capabilities used by the rendering pipeline.
 */
export interface TerminalCapabilities {
  /** The detected terminal color profile. */
  colorProfile: TerminalColorProfile;

  /** Whether synchronized output mode 2026 is supported. */
  synchronizedOutput: boolean;

  /** Whether unicode width mode 2027 is supported. */
  unicodeWidth: boolean;

  /** The best available terminal graphics protocol for inline images. */
  graphicsProtocol: TerminalGraphicsProtocol;
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

  /** Whether to enable terminal mouse reporting (any-motion + SGR coordinates). */
  mouse?: boolean;
}

export type {CaretOverlay, CaretSelectionRange} from './CaretOverlay';
export type {EditableConfiguration} from './EditableConfiguration';
export type {EditableState} from './EditableState';
export type {VisualLine} from './VisualLine';
