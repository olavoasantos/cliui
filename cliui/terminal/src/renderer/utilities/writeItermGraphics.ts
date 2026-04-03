import type {ImageRenderRequest} from '../types/ImageRenderRequest';
import type {GraphicsProtocol} from '../types/GraphicsProtocol';

const ESC = '\u001B';
const OSC = `${ESC}]`;
const BEL = '\u0007';

/**
 * iTerm2 inline images protocol implementation.
 *
 * Transmits base64-encoded image data via OSC 1337 escape sequences.
 * The terminal handles decoding and scaling to fit the specified
 * cell dimensions.
 *
 * @see https://iterm2.com/documentation-images.html
 */
export const itermGraphicsProtocol: GraphicsProtocol = {
  name: 'iterm2',

  render(request: ImageRenderRequest): string {
    const {data, x, y, cellWidth, cellHeight} = request;
    const encoded = Buffer.from(data).toString('base64');

    // Position cursor at the image location
    let output = `${ESC}[${y + 1};${x + 1}H`;

    // OSC 1337 ; File=[args] : base64data BEL
    output += `${OSC}1337;File=inline=1`;
    output += `;width=${cellWidth}`;
    output += `;height=${cellHeight}`;
    output += `;preserveAspectRatio=1`;
    output += `:${encoded}${BEL}`;

    return output;
  },
};
