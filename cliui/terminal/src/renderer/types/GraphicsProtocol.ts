import type {ImageRenderRequest} from './ImageRenderRequest';

/**
 * Supported terminal graphics protocol identifiers.
 */
export type GraphicsProtocolName = 'kitty' | 'iterm2' | 'sixel' | 'fallback' | (string & {});

/**
 * A pluggable terminal graphics protocol that can render images.
 *
 * Protocols are registered with the {@link Renderer} in priority order.
 * During each frame, the renderer selects the first protocol whose
 * `name` matches the detected terminal capability (or `'fallback'`
 * when none match).
 *
 * External packages (e.g., `@cliui/sixel`) implement this interface
 * to add new protocols.
 */
export interface GraphicsProtocol {
  /** Unique protocol identifier used for capability matching. */
  readonly name: GraphicsProtocolName;

  /**
   * Produces terminal escape sequences that render an image.
   *
   * @param request - The image data and target cell region.
   * @returns Escape sequence string to write to the terminal.
   */
  render(request: ImageRenderRequest): string;
}
