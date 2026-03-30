/** Regex matching decimal digit characters (Unicode-aware). */
const DECIMAL_DIGIT_RE = /\p{Nd}/u;

/** Characters that join numeric components (`:`, `-`, `/`, `×`, etc.). */
const NUMERIC_JOINERS = new Set([':', '-', '/', '\u00D7', ',', '.', '+', '\u2013', '\u2014']);

/**
 * Merges consecutive numeric run segments so expressions like
 * `7:00-9:00` or `२४×७` stay together during line breaking.
 *
 * Operates on parallel arrays in-place.
 *
 * @param words - Segment text array.
 * @param widths - Segment width array.
 * @param graphemeWidths - Grapheme width array.
 * @param graphemes - Grapheme text array.
 */
export function mergeNumericRuns(
  words: string[],
  widths: number[],
  graphemeWidths: (number[] | null)[],
  graphemes: (string[] | null)[],
): void {
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;

    if (word === ' ' || !isNumericRun(word) || !DECIMAL_DIGIT_RE.test(word)) continue;

    let mergedText = word;
    let mergedWidth = widths[i]!;
    let j = i + 1;

    while (j < words.length && words[j] !== ' ' && isNumericRun(words[j]!)) {
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

/**
 * Returns whether a text is entirely composed of digits and numeric joiners.
 */
function isNumericRun(text: string): boolean {
  if (text.length === 0) return false;

  for (const ch of text) {
    if (!DECIMAL_DIGIT_RE.test(ch) && !NUMERIC_JOINERS.has(ch)) return false;
  }

  return true;
}
