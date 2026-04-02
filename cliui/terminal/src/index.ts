/**
 * Main entry point — installs the global environment polyfill as a side
 * effect so that frameworks referencing `document`, `window`,
 * `navigator`, etc. on `globalThis` pick up the terminal DOM
 * automatically.
 *
 * Use `@micra/terminal-dom/core` for a side-effect-free import.
 */

import {Window} from '@cliui/dom';
import {polyfillEnvironment} from '@cliui/dom';

polyfillEnvironment(new Window());

export {Terminal} from './classes/Terminal';

export {ClipboardEvent, Document, Element, Event, KeyboardEvent, MouseEvent, Window} from '@cliui/dom';

export {polyfillEnvironment} from '@cliui/dom';

export type {TerminalOptions} from './types';
export type {
  TerminalInput,
  TerminalInputEvent,
  TerminalKeyEvent,
  TerminalOutput,
  TerminalPasteEvent,
  TerminalReadableInput,
} from './terminal';
