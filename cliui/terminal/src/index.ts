/**
 * Main entry point — installs the global environment polyfill as a side
 * effect so that frameworks referencing `document`, `window`,
 * `navigator`, etc. on `globalThis` pick up the terminal DOM
 * automatically.
 *
 * Use `@cliui/terminal/core` for a side-effect-free import.
 */

import {Window} from '@cliui/dom';
import {polyfillEnvironment} from '@cliui/dom';

polyfillEnvironment(new Window());

export {Terminal} from './classes/Terminal';
export {TerminalVitals} from './classes/TerminalVitals';

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
  TerminalVitalsCallback,
  TerminalVitalsMetric,
  TerminalVitalsMetricName,
} from './types/TerminalVitalsMetric';
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
export {LayoutEngine} from './layout/classes/LayoutEngine';
export {cellWidth} from './layout/utilities/cellWidth';
export {graphemeWidth} from './layout/utilities/graphemeWidth';
export {GRAPHEME_SEGMENTER} from './layout/constants/cellWidth';
export {EDITABLE} from './terminal/constants/editable';

export type {FrameDetail} from './classes/FrameInstrumentation';
export type {TerminalPlugin, TerminalPluginContext} from './types/TerminalPlugin';
export type {GraphicsProtocol, GraphicsProtocolName} from './renderer/types/GraphicsProtocol';
export type {ImageRenderRequest} from './renderer/types/ImageRenderRequest';
