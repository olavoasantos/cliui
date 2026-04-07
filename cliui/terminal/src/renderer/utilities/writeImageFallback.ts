import type {ImageRenderRequest} from '../types';
import type {GraphicsProtocol} from '../types';

const PLACEHOLDER_CHAR = '░';

/**
 * Text-based fallback for terminals without graphics protocol support.
 *
 * When `alt` text is provided, renders it within the image region
 * (truncated to fit). Otherwise fills the region with placeholder
 * block characters (`░`).
 *
 * This protocol is always registered last in the protocol list and
 * matches the `'fallback'` capability.
 */
export const fallbackGraphicsProtocol: GraphicsProtocol = {
  name: 'fallback',

  render(request: ImageRenderRequest): string {
    const {x, y, cellWidth, cellHeight, alt} = request;
    const ESC = '\u001B';
    let output = '';

    if (alt.length > 0) {
      // Render alt text on the first row of the image region
      const truncated = alt.length > cellWidth ? alt.slice(0, cellWidth - 1) + '…' : alt;
      output += `${ESC}[${y + 1};${x + 1}H${truncated}`;

      // Fill remaining rows with spaces
      for (let row = 1; row < cellHeight; row++) {
        output += `${ESC}[${y + 1 + row};${x + 1}H${' '.repeat(cellWidth)}`;
      }
    } else {
      // Fill entire region with placeholder characters
      for (let row = 0; row < cellHeight; row++) {
        output += `${ESC}[${y + 1 + row};${x + 1}H${PLACEHOLDER_CHAR.repeat(cellWidth)}`;
      }
    }

    return output;
  },
};
