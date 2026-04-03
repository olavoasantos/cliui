/**
 * Side-effect-free entry point.
 *
 * Exports the same public API as the main `@cliui/terminal` entry
 * point but does **not** install the global environment polyfill.  Use
 * this when global mutation is unacceptable — you are then responsible
 * for passing a `Window` instance to `Terminal` via its options.
 */

export {Terminal} from './classes/Terminal';

export {
  ClipboardEvent,
  Document,
  Element,
  Event,
  KeyboardEvent,
  MouseEvent,
  Window,
} from '@cliui/dom';

export {polyfillEnvironment} from '@cliui/dom';

export type {TerminalOptions} from './types';
export type {TerminalFrameAware} from './types/TerminalFrameAware';
export type {
  TerminalInput,
  TerminalInputEvent,
  TerminalKeyEvent,
  TerminalOutput,
  TerminalPasteEvent,
  TerminalReadableInput,
} from './terminal';
export type {EditableConfiguration} from './terminal/types/EditableConfiguration';

/* Engine internals re-exported for @cliui/elements */
export {CellBuffer} from './renderer/classes/CellBuffer';
export {Painter} from './renderer/classes/Painter';
export {Renderer} from './renderer/classes/Renderer';
export {StyleEngine} from './css/classes/StyleEngine';
export {appendUserAgentStyles} from './css/utilities/appendUserAgentStyles';
export {parseImageHeader} from './renderer/utilities/parseImageHeader';
export {LayoutEngine} from './layout/classes/LayoutEngine';
export {cellWidth} from './layout/utilities/cellWidth';
export {graphemeWidth} from './layout/utilities/graphemeWidth';
export {GRAPHEME_SEGMENTER} from './layout/constants/cellWidth';
export {EDITABLE} from './terminal/constants/editable';

export type {TerminalPlugin, TerminalPluginContext} from './types/TerminalPlugin';
export type {GraphicsProtocol, GraphicsProtocolName} from './renderer/types/GraphicsProtocol';
export type {ImageRenderRequest} from './renderer/types/ImageRenderRequest';
