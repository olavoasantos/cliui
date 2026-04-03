import type {TerminalOutput, TerminalReadableInput} from '../terminal/types';
import type {TerminalPlugin} from './TerminalPlugin';

import type {Window} from '@cliui/dom';

/**
 * Public configuration options for the `Terminal` class.
 */
export interface TerminalOptions {
  /** Whether to use the alternate screen buffer. */
  altScreen?: boolean;

  /** Whether to enable mouse reporting mode 1006. */
  mouse?: boolean;

  /** Target frames per second for the background render loop. */
  fps?: number;

  /** Output stream that receives terminal escape sequences and text. */
  output?: TerminalOutput;

  /** Input stream that provides raw terminal input chunks. */
  input?: TerminalReadableInput;

  /**
   * DOM `Window` instance powering this terminal.
   *
   * When omitted the constructor reads `globalThis.window` — which the
   * default `@cliui/terminal` import populates automatically via
   * the environment polyfill.  Pass an explicit instance when using the
   * side-effect-free `@cliui/terminal/core` entry point.
   */
  window?: Window;

  /**
   * Terminal plugins to install after construction.
   *
   * Plugins are installed in order and can register graphics protocols,
   * extend capabilities, or hook into the frame loop.
   *
   * @example
   * ```ts
   * import {sixelProtocol} from '@cliui/sixel';
   *
   * const terminal = new Terminal({
   *   plugins: [sixelProtocol()],
   * });
   * ```
   */
  plugins?: TerminalPlugin[];
}
