/** Configuration options for the terminal-dom Vite plugin. */
export interface TerminalDomPluginOptions {
  /** Terminal frame rate. Defaults to 60. */
  fps?: number;
  /** Whether to use the alternate screen buffer. Defaults to true. */
  altScreen?: boolean;
}
