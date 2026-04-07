import type {CellBuffer} from '../../renderer/classes/CellBuffer';
import type {GraphicsProtocol} from '../../renderer/types';
import type {StyleEngine} from '../../css/classes/StyleEngine';
import type {LayoutBox} from '../../layout/types';
import type {Window, Document, Element} from '@cliui/dom';
import type {EDITABLE_STATE} from '../constants/editableState';
import type {EditableState, TerminalOutput, TerminalReadableInput} from '../../terminal/types';

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

/**
 * Contract for nodes that advance internal state in response to terminal frame ticks.
 */
export interface TerminalFrameAware {
  /**
   * Called by the terminal render loop with the current timestamp in milliseconds.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(timestamp: number): void;
}

/** Non-timing metadata attached to each `terminal.frame` measure. */
export interface FrameDetail {
  dirtyElements: number;
  totalElements: number;
  outputBytes: number;
  idle: boolean;
}

/** Union of all terminal vital metric names. */
export type TerminalVitalsMetricName =
  | 'first-contentful-paint'
  | 'largest-contentful-paint'
  | 'interaction-to-next-paint'
  | 'input-dispatch-latency'
  | 'dropped-frames'
  | 'frame-budget-utilization'
  | 'idle-frame-ratio'
  | 'dirty-element-ratio'
  | 'frame-output-size';

/** A single metric report delivered by {@link TerminalVitals}. */
export interface TerminalVitalsMetric {
  /** The metric identifier. */
  name: TerminalVitalsMetricName;
  /** The computed value for this metric. */
  value: number;
}

/** Callback invoked by {@link TerminalVitals.onMetric}. */
export type TerminalVitalsCallback = (metric: TerminalVitalsMetric) => void;

/**
 * Context provided to terminal plugins during installation.
 *
 * Exposes the subset of terminal internals that plugins are allowed
 * to extend — graphics protocol registration, style engine access,
 * layout tree access, and window/document references.
 */
export interface TerminalPluginContext {
  /**
   * Registers a graphics protocol with the rendering pipeline.
   *
   * Protocols are tried in registration order. The first protocol
   * whose `name` matches the detected terminal capability is used.
   * The built-in `'fallback'` protocol is always registered last.
   *
   * @param protocol - The graphics protocol implementation.
   */
  registerGraphicsProtocol(protocol: GraphicsProtocol): void;

  /** Returns the terminal's DOM window. */
  readonly window: Window;

  /** Returns the terminal's DOM document. */
  readonly document: Document;

  /** Returns the terminal's style engine for computed style access. */
  readonly styleEngine: StyleEngine;

  /**
   * Returns the current layout root, or `null` if layout hasn't run yet.
   *
   * The layout tree is rebuilt on each frame, so callers should not
   * cache the result across frames.
   */
  getLayoutRoot(): LayoutBox | null;

  /**
   * Looks up the layout box for a specific DOM element.
   *
   * Returns `null` if the element has no layout box (e.g., `display: none`
   * or not yet laid out).
   */
  getLayoutBox(element: Element): LayoutBox | null;

  /**
   * Returns the current cell buffer after the last render.
   *
   * Each cell contains the character, foreground/background colors,
   * and text attributes (bold, italic, underline, etc.).
   */
  getCellBuffer(): CellBuffer | null;
}

/**
 * Extension point for the Terminal pipeline.
 *
 * Plugins are installed via `new Terminal({ plugins: [...] })`.
 * The `install` hook runs after the terminal is fully wired,
 * giving the plugin access to register graphics protocols,
 * add capabilities, or hook into the frame loop.
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
export interface TerminalPlugin {
  /** Human-readable plugin name for diagnostics. */
  readonly name: string;

  /**
   * Called once after the Terminal constructor has finished wiring.
   *
   * @param context - Access to extensible terminal internals.
   */
  install(context: TerminalPluginContext): void;
}

/**
 * Type helper for elements carrying system-managed editable state.
 * @internal
 */
export type EditableStateElement = {
  [key in typeof EDITABLE_STATE]: EditableState;
};
