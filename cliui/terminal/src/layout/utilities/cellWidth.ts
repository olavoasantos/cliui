import {GRAPHEME_SEGMENTER, PRINTABLE_ASCII_REGEX} from '../constants/cellWidth';
import {graphemeWidth} from './graphemeWidth';
import {stripAnsi} from './stripAnsi';

/**
 * Determines the terminal cell width of a string.
 *
 * Uses `Intl.Segmenter` for grapheme segmentation and East Asian Width data
 * for width classification. Zero runtime dependencies — `Intl.Segmenter` is
 * native to Node 22+.
 *
 * Width rules per grapheme cluster:
 * 1. Non-printing clusters (Default_Ignorable, Control, Format, Mark, Surrogate) → 0
 * 2. Emoji sequences (pictographic with presentation or ZWJ sequences) → 2
 * 3. East Asian Fullwidth or Wide code points → 2
 * 4. Everything else → 1
 *
 * @param input - The string to measure.
 * @returns The total terminal cell width.
 */
export function cellWidth(input: string): number {
  if (input.length === 0) {
    return 0;
  }

  if (input.includes('\u001B') || input.includes('\u009B')) {
    input = stripAnsi(input);
  }

  if (input.length === 0) {
    return 0;
  }

  if (PRINTABLE_ASCII_REGEX.test(input)) {
    return input.length;
  }

  let width = 0;

  for (const {segment} of GRAPHEME_SEGMENTER.segment(input)) {
    width += graphemeWidth(segment);
  }

  return width;
}
