import type {TerminalInput, TerminalManagerOptions, TerminalOutput} from '../types';

const ESC = '\u001B';
const ENABLE_ALT_SCREEN = `${ESC}[?1049h`;
const DISABLE_ALT_SCREEN = `${ESC}[?1049l`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const ENABLE_MOUSE_SGR = `${ESC}[?1006h`;
const DISABLE_MOUSE_SGR = `${ESC}[?1006l`;
const ENABLE_FOCUS_EVENTS = `${ESC}[?1004h`;
const DISABLE_FOCUS_EVENTS = `${ESC}[?1004l`;
const ENABLE_BRACKETED_PASTE = `${ESC}[?2004h`;
const DISABLE_BRACKETED_PASTE = `${ESC}[?2004l`;

/**
 * Manages terminal mode transitions required for interactive TUI rendering.
 *
 * Startup enables raw input handling and writes the terminal control sequences
 * needed for full-screen operation in Phase 1. Shutdown reverses those changes
 * in reverse order so the terminal returns to its prior state.
 */
export class TerminalManager {
  private input: TerminalInput;
  private output: TerminalOutput;
  private altScreen: boolean;
  private mouse: boolean;
  private active = false;

  /**
   * Creates a new terminal mode manager.
   *
   * @param options - Streams and feature flags for terminal lifecycle control.
   */
  constructor(options: TerminalManagerOptions) {
    this.input = options.input;
    this.output = options.output;
    this.altScreen = options.altScreen ?? true;
    this.mouse = options.mouse ?? false;
  }

  /**
   * Enters TUI terminal modes if they are not already active.
   */
  start(): void {
    if (this.active) {
      return;
    }

    this.setRawMode(true);

    if (this.altScreen) {
      this.write(ENABLE_ALT_SCREEN);
    }

    this.write(HIDE_CURSOR);

    if (this.mouse) {
      this.write(ENABLE_MOUSE_SGR);
    }

    this.write(ENABLE_FOCUS_EVENTS);
    this.write(ENABLE_BRACKETED_PASTE);
    this.active = true;
  }

  /**
   * Restores terminal modes if they are currently active.
   */
  stop(): void {
    if (!this.active) {
      return;
    }

    this.write(DISABLE_BRACKETED_PASTE);
    this.write(DISABLE_FOCUS_EVENTS);

    if (this.mouse) {
      this.write(DISABLE_MOUSE_SGR);
    }

    this.write(SHOW_CURSOR);

    if (this.altScreen) {
      this.write(DISABLE_ALT_SCREEN);
    }

    this.setRawMode(false);
    this.active = false;
  }

  private setRawMode(enabled: boolean): void {
    this.input.setRawMode?.(enabled);
  }

  private write(sequence: string): void {
    this.output.write(sequence);
  }
}
