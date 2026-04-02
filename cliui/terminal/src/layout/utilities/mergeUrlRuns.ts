import {isUrlRunStart} from './isUrlRunStart';

/**
 * Merges URL-like runs into single segments so URLs stay together
 * as breakable units rather than splitting at `/` or `.` boundaries.
 *
 * Operates on parallel arrays in-place. Only called for non-ASCII
 * prepared text where explicit space segments are present.
 *
 * @param words - Segment text array.
 * @param widths - Segment width array.
 * @param graphemeWidths - Grapheme width array.
 * @param graphemes - Grapheme text array.
 */
export function mergeUrlRuns(
  words: string[],
  widths: number[],
  graphemeWidths: (number[] | null)[],
  graphemes: (string[] | null)[],
): void {
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;

    if (word === ' ') continue;

    const nextWord = i + 1 < words.length && words[i + 1] !== ' ' ? words[i + 1] : undefined;

    if (!isUrlRunStart(word, nextWord)) continue;

    let mergedText = word;
    let mergedWidth = widths[i]!;
    let j = i + 1;

    while (j < words.length && words[j] !== ' ') {
      mergedText += words[j]!;
      mergedWidth += widths[j]!;
      j++;
    }

    const count = j - i;

    if (count > 1) {
      words[i] = mergedText;
      widths[i] = mergedWidth;
      graphemeWidths[i] = null;
      graphemes[i] = null;
      words.splice(i + 1, count - 1);
      widths.splice(i + 1, count - 1);
      graphemeWidths.splice(i + 1, count - 1);
      graphemes.splice(i + 1, count - 1);
    }
  }
}
