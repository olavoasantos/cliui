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

  /**
   * Notification protocol supported by this terminal.
   *
   * - `'osc9'` — iTerm2/Konsole style (OSC 9)
   * - `'osc777'` — rxvt-unicode style (OSC 777)
   * - `'none'` — no notification support; falls back to BEL
   */
  notificationProtocol: 'osc9' | 'osc777' | 'none';
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

import type {Element} from '@cliui/dom';
import type {PerformanceEventTimingOptions} from '@cliui/dom';
import type {EDITABLE} from '../constants/editable';
import type {Caret} from '../classes/Caret';

/**
 * Screen-space caret and selection data produced by the `CaretManager`
 * for the renderer to overlay onto the cell buffer.
 */
export interface CaretOverlay {
  /** Screen x coordinate of the cursor cell. */
  cursorX: number;
  /** Screen y coordinate of the cursor cell. */
  cursorY: number;
  /** Whether the cursor is in the visible blink phase. */
  cursorVisible: boolean;
  /** Selected cell ranges to highlight (inverted bg/fg). */
  selection: CaretSelectionRange[];
}

/** A contiguous horizontal range of selected cells on a single row. */
export interface CaretSelectionRange {
  /** Screen x coordinate of the first selected cell. */
  x: number;
  /** Screen y coordinate of the row. */
  y: number;
  /** Number of cells in this range. */
  width: number;
}

/**
 * Declarative configuration for an editable text surface.
 *
 * Components set `[EDITABLE]` to this interface and the terminal
 * editing system manages all state, event handling, cursor rendering,
 * scrolling, and content synchronization automatically.
 */
export interface EditableConfiguration {
  /** Returns the intrinsic width of the editing surface in terminal cells. */
  intrinsicWidth(): number;
  /** Returns the intrinsic height of the editing surface in rows. */
  intrinsicHeight(): number;
  /** Whether to wrap text at the viewport width boundary. */
  wordWrap: boolean;
  /** Whether Enter inserts newlines and ArrowUp/Down navigate lines. */
  multiLine: boolean;
  /** Attribute name to sync the grapheme value to. */
  valueAttribute?: string;
  /** Returns the maximum grapheme count, or 0 for unlimited. */
  maxLength?(): number;
  /** Returns the placeholder text to display when the field is empty and unfocused. */
  placeholder?(): string;
}

/**
 * Represents a single visual line computed from a flat grapheme array.
 */
export interface VisualLine {
  /** Grapheme index where this visual line starts (inclusive). */
  start: number;
  /** Grapheme index where this visual line ends (exclusive). */
  end: number;
  /** Total terminal cell width of the graphemes on this line. */
  width: number;
}

/**
 * Mutable cache state for {@link cachedComputeVisualLines}.
 * @internal
 */
export interface VisualLineCache {
  graphemes: string[] | null;
  graphemeCount: number;
  viewportWidth: number;
  wordWrap: boolean;
  lines: VisualLine[] | null;
}

/**
 * Options for {@link handleCaretKeyDown}.
 * @internal
 */
export interface CaretKeyDownOptions {
  /** Callback invoked when the user triggers a clipboard copy or cut. */
  onClipboardWrite?: (text: string) => void;
  /** Callback invoked when the user triggers a clipboard paste. */
  onClipboardRead?: () => string;
  /** Declarative editable configuration for 2D navigation support. */
  config?: EditableConfiguration;
  /** Resolved viewport width in terminal cells from the element's layout. */
  viewportWidth?: number;
  /** Resolved viewport height in rows from the element's layout. */
  viewportHeight?: number;
}

/**
 * Internal contract used by the caret system to interact with editable text content.
 * @internal
 */
export interface Editable {
  getGraphemes(): string[];
  getCursorPosition(): number;
  setCursorPosition(position: number): void;
  insertText(text: string): void;
  deleteRange(start: number, end: number): void;
  getEditableWidth(): number;
  getScrollOffset(): number;
  getScrollY(): number;
  updateScroll(): void;
  isReadonly(): boolean;
  isDisabled(): boolean;
  getElement(): Element;
  getVisualLineCache(): VisualLineCache;
}

/**
 * Type helper for elements that carry the editable symbol.
 * @internal
 */
export type EditableElement = {
  [key in typeof EDITABLE]: EditableConfiguration;
};

/**
 * System-managed editing state for an element with `[EDITABLE]`.
 * @internal
 */
export interface EditableState {
  graphemes: string[];
  cursorPosition: number;
  scrollX: number;
  scrollY: number;
  isFocused: boolean;
  valueAtFocus: string;
  caret: Caret | null;
  resolvedWidth: number;
  resolvedHeight: number;
  visualLineCache: VisualLineCache;
}

/**
 * Tracks in-progress input event timings that are waiting for the next
 * render frame to finalize their `duration`.
 * @internal
 */
export interface PendingEventTiming {
  options: PerformanceEventTimingOptions;
  isFirstInput: boolean;
}
