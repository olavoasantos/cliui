/**
 * Side-effect-free entry point.
 *
 * Exports the same public API as the main `@micra/terminal-dom` entry
 * point but does **not** install the global environment polyfill.  Use
 * this when global mutation is unacceptable — you are then responsible
 * for passing a `Window` instance to `Terminal` via its options.
 */

export {Terminal} from './classes/Terminal';

export {ClipboardEvent, Document, Element, Event, KeyboardEvent, MouseEvent, Window} from './dom';

export {polyfillEnvironment} from './dom';

export type {TerminalOptions} from './types';
export type {
  TerminalInput,
  TerminalInputEvent,
  TerminalKeyEvent,
  TerminalOutput,
  TerminalPasteEvent,
  TerminalReadableInput,
} from './terminal';
