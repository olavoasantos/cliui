import type {ImageRenderRequest} from '../types';
import type {GraphicsProtocol} from '../types';

const ESC = '\u001B';
const APC = `${ESC}_`;
const ST = `${ESC}\\`;

/** Maximum chunk size in bytes for Kitty graphics transmission. */
const CHUNK_SIZE = 4096;

/**
 * Kitty graphics protocol implementation.
 *
 * Transmits image data via APC escape sequences and places the image
 * at the specified cell coordinates. The terminal handles scaling to
 * fit the requested cell dimensions.
 *
 * @see https://sw.kovidgoyal.net/kitty/graphics-protocol/
 */
export const kittyGraphicsProtocol: GraphicsProtocol = {
  name: 'kitty',

  render(request: ImageRenderRequest): string {
    const {data, x, y, cellWidth, cellHeight} = request;
    const encoded = uint8ArrayToBase64(data);
    const chunks = splitChunks(encoded, CHUNK_SIZE);
    let output = '';

    // Position cursor at the image location
    output += `${ESC}[${y + 1};${x + 1}H`;

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const moreFlag = isLast ? 0 : 1;

      if (i === 0) {
        // First chunk: include all metadata
        // a=T (transmit and display), f=100 (PNG/auto-detect), t=d (direct data)
        // c=columns, r=rows for cell-based placement
        output += `${APC}Ga=T,f=100,t=d,c=${cellWidth},r=${cellHeight},m=${moreFlag};${chunks[i]}${ST}`;
      } else {
        // Continuation chunks
        output += `${APC}Gm=${moreFlag};${chunks[i]}${ST}`;
      }
    }

    return output;
  },
};

/**
 * Splits a string into chunks of the specified maximum size.
 */
function splitChunks(str: string, size: number): string[] {
  if (str.length <= size) {
    return [str];
  }

  const chunks: string[] = [];

  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }

  return chunks;
}

/**
 * Converts a Uint8Array to a base64 string using Node.js Buffer.
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}
