/**
 * Context provided to terminal plugins during installation.
 *
 * Exposes the subset of terminal internals that plugins are allowed
 * to extend — primarily graphics protocol registration.
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
  registerGraphicsProtocol(
    protocol: import('../renderer/types/GraphicsProtocol').GraphicsProtocol,
  ): void;
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
