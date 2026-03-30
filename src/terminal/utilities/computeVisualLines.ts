import {cellWidth} from '../../layout/utilities/cellWidth';

import type {VisualLine} from '../types/VisualLine';

/**
 * Maps a flat grapheme array into visual lines, accounting for explicit
 * `\n` line breaks and optional word wrapping at a given viewport width.
 *
 * @param graphemes - The flat grapheme array (may contain `\n` entries).
 * @param viewportWidth - The maximum visual width in terminal cells.
 * @param wordWrap - Whether to wrap lines that exceed the viewport width.
 * @returns An array of visual lines with start/end indices and cell widths.
 */
export function computeVisualLines(
  graphemes: string[],
  viewportWidth: number,
  wordWrap: boolean,
): VisualLine[] {
  if (graphemes.length === 0) {
    return [{start: 0, end: 0, width: 0}];
  }

  const lines: VisualLine[] = [];
  let lineStart = 0;
  let lineWidth = 0;

  for (let i = 0; i < graphemes.length; i++) {
    const grapheme = graphemes[i]!;

    if (grapheme === '\n') {
      lines.push({start: lineStart, end: i, width: lineWidth});
      lineStart = i + 1;
      lineWidth = 0;
      continue;
    }

    const w = cellWidth(grapheme);

    if (wordWrap && lineWidth + w > viewportWidth && lineWidth > 0) {
      lines.push({start: lineStart, end: i, width: lineWidth});
      lineStart = i;
      lineWidth = w;
    } else {
      lineWidth += w;
    }
  }

  lines.push({start: lineStart, end: graphemes.length, width: lineWidth});

  return lines;
}
