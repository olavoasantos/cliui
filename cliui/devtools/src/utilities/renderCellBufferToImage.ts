import {createCanvas} from '@napi-rs/canvas';

/**
 * Cell data needed for rendering. Matches the subset of
 * `@cliui/terminal`'s `Cell` interface we read.
 */
interface CellLike {
  char: string;
  fg: {r: number; g: number; b: number} | null;
  bg: {r: number; g: number; b: number} | null;
  bold: boolean;
  italic: boolean;
  faint: boolean;
}

/**
 * Cell buffer interface — matches `CellBuffer.get(x, y)`.
 */
interface CellBufferLike {
  cols: number;
  rows: number;
  get(x: number, y: number): CellLike | undefined;
}

/** Default cell dimensions in pixels. */
const CELL_WIDTH = 8;
const CELL_HEIGHT = 16;
const FONT_SIZE = 14;

/**
 * Renders a terminal cell buffer to a PNG image.
 *
 * Each cell becomes a fixed-size rectangle with a background color
 * and a monospace character drawn on top. The result is a base64-
 * encoded PNG suitable for `Page.captureScreenshot`.
 *
 * @param buffer - The cell buffer to render.
 * @returns Base64-encoded PNG data.
 */
export function renderCellBufferToImage(buffer: CellBufferLike): string {
  const {cols, rows} = buffer;
  const width = cols * CELL_WIDTH;
  const height = rows * CELL_HEIGHT;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Default background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'top';

  for (let row = 0; row < rows; row++) {
    const y = row * CELL_HEIGHT;

    for (let col = 0; col < cols; col++) {
      const cell = buffer.get(col, row);
      if (!cell) continue;

      const x = col * CELL_WIDTH;

      // Background
      if (cell.bg) {
        ctx.fillStyle = `rgb(${cell.bg.r},${cell.bg.g},${cell.bg.b})`;
        ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);
      }

      // Character
      if (cell.char && cell.char !== ' ') {
        const fg = cell.fg ?? {r: 255, g: 255, b: 255};
        const alpha = cell.faint ? 0.5 : 1;
        ctx.fillStyle = `rgba(${fg.r},${fg.g},${fg.b},${alpha})`;

        const weight = cell.bold ? 'bold' : 'normal';
        const style = cell.italic ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${FONT_SIZE}px monospace`;

        ctx.fillText(cell.char, x, y + 1);
      }
    }
  }

  const pngBuffer = canvas.toBuffer('image/png');
  return pngBuffer.toString('base64');
}
