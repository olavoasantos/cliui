import type {TerminalOutput, TerminalReadableInput} from '../terminal/types';

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
}
