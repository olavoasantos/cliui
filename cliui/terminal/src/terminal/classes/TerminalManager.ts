import {
  DISABLE_ALT_SCREEN,
  DISABLE_BRACKETED_PASTE,
  DISABLE_FOCUS_EVENTS,
  DISABLE_MOUSE_ANY_EVENTS,
  DISABLE_MOUSE_SGR,
  ENABLE_ALT_SCREEN,
  ENABLE_BRACKETED_PASTE,
  ENABLE_FOCUS_EVENTS,
  ENABLE_MOUSE_ANY_EVENTS,
  ENABLE_MOUSE_SGR,
  HIDE_CURSOR,
  SHOW_CURSOR,
} from '../constants/controlSequences';
import {SUPPORTED_MODE_RESPONSE} from '../constants/terminalManager';
import {ESCAPE} from '../constants/escape';

import type {
  TerminalCapabilities,
  TerminalColorProfile,
  TerminalInput,
  TerminalManagerOptions,
  TerminalOutput,
} from '../types';

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
  private capabilities: TerminalCapabilities = {
    colorProfile: 'truecolor',
    synchronizedOutput: false,
    unicodeWidth: false,
  };

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
      this.write(ENABLE_MOUSE_ANY_EVENTS);
      this.write(ENABLE_MOUSE_SGR);
    }

    this.write(ENABLE_FOCUS_EVENTS);
    this.write(ENABLE_BRACKETED_PASTE);
    this.active = true;
  }

  /**
   * Detects terminal rendering capabilities and stores them for later access.
   *
   * @param timeoutMs - Maximum time to wait for each capability response.
   * @returns The detected capability snapshot.
   */
  async detectCapabilities(timeoutMs = 50): Promise<TerminalCapabilities> {
    const colorProfile = this.detectColorProfile();
    const [synchronizedOutput, unicodeWidth] = await Promise.all([
      this.queryModeSupport(2026, timeoutMs),
      this.queryModeSupport(2027, timeoutMs),
    ]);

    this.capabilities = {
      colorProfile,
      synchronizedOutput,
      unicodeWidth,
    };

    return this.getCapabilities();
  }

  /**
   * Returns the latest detected terminal capabilities.
   */
  getCapabilities(): TerminalCapabilities {
    return {...this.capabilities};
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
      this.write(DISABLE_MOUSE_ANY_EVENTS);
    }

    this.write(SHOW_CURSOR);

    if (this.altScreen) {
      this.write(DISABLE_ALT_SCREEN);
    }

    this.setRawMode(false);
    this.active = false;
  }

  private detectColorProfile(): TerminalColorProfile {
    const depth = this.output.getColorDepth?.();

    if (depth === undefined) {
      return 'none';
    }

    if (depth >= 24) {
      return 'truecolor';
    }

    if (depth >= 8) {
      return 'ansi256';
    }

    if (depth >= 4) {
      return 'ansi16';
    }

    return 'none';
  }

  private async queryModeSupport(mode: 2026 | 2027, timeoutMs: number): Promise<boolean> {
    if (this.input.on === undefined || this.input.off === undefined) {
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let buffer = '';
      const timer = setTimeout(
        () => {
          finish(false);
        },
        Math.max(0, timeoutMs),
      );
      const finish = (supported: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        this.input.off?.('data', onData);
        resolve(supported);
      };
      const onData = (chunk: Buffer | string): void => {
        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

        const match = buffer.match(SUPPORTED_MODE_RESPONSE);

        if (match === null) {
          return;
        }

        if (match[1] !== String(mode)) {
          buffer = buffer.slice(match.index! + match[0].length);
          return;
        }

        finish(match[2] !== '0');
      };

      this.input.on?.('data', onData);
      this.write(`${ESCAPE}[?${mode}$p`);
    });
  }

  private setRawMode(enabled: boolean): void {
    this.input.setRawMode?.(enabled);
  }

  private write(sequence: string): void {
    this.output.write(sequence);
  }
}
