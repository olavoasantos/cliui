import type {CellBuffer} from '../renderer/classes/CellBuffer';
import type {GraphicsProtocol} from '../renderer/types/GraphicsProtocol';
import type {StyleEngine} from '../css/classes/StyleEngine';
import type {LayoutBox} from '../layout/types';
import type {Window, Document, Element} from '@cliui/dom';

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
