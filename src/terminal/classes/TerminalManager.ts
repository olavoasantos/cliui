import {
  DISABLE_ALT_SCREEN,
  DISABLE_BRACKETED_PASTE,
  DISABLE_FOCUS_EVENTS,
  DISABLE_MOUSE_BUTTON_EVENTS,
  DISABLE_MOUSE_SGR,
  ENABLE_ALT_SCREEN,
  ENABLE_BRACKETED_PASTE,
  ENABLE_FOCUS_EVENTS,
  ENABLE_MOUSE_BUTTON_EVENTS,
  ENABLE_MOUSE_SGR,
  HIDE_CURSOR,
  SHOW_CURSOR,
} from '../constants/controlSequences';

import type {TerminalInput, TerminalManagerOptions, TerminalOutput} from '../types';

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
      this.write(ENABLE_MOUSE_BUTTON_EVENTS);
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
      this.write(DISABLE_MOUSE_BUTTON_EVENTS);
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
