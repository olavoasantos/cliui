import type {PreparedText} from '../types/PreparedText';
import type {TextLine} from '../types';

/**
 * Lays out prepared text at a given width using pure arithmetic on
 * cached word widths.
 *
 * No `cellWidth` calls, no `Intl.Segmenter` invocations, no string
 * splitting — this is the cheap hot path called on every resize.
 *
 * @param prepared - The prepared text handle from {@link prepareText}.
 * @param availableWidth - The maximum terminal cell width per line.
 * @param canBreakWords - Whether long words may be broken at grapheme boundaries.
 * @returns An array of text lines.
 */
export function layoutPreparedText(
  prepared: PreparedText,
  availableWidth: number,
  canBreakWords = true,
): TextLine[] {
  return prepared.hasExplicitSpaces
    ? layoutExplicitSpaces(prepared, availableWidth, canBreakWords)
    : layoutImplicitSpaces(prepared, availableWidth, canBreakWords);
}

/**
 * Fast path for ASCII text where spaces between words are implicit.
 * Mirrors the original `measureNormal` logic exactly.
 */
function layoutImplicitSpaces(
  prepared: PreparedText,
  availableWidth: number,
  canBreakWords: boolean,
): TextLine[] {
  const {words, widths, graphemeWidths, graphemes} = prepared;
  const lines: TextLine[] = [];

  let currentText = '';
  let currentWidth = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const wordWidth = widths[i]!;

    if (currentText.length === 0) {
      if (wordWidth <= availableWidth) {
        currentText = word;
        currentWidth = wordWidth;
      } else if (canBreakWords) {
        breakWordAt(i, availableWidth, lines, graphemeWidths, graphemes, words, widths, (t, w) => {
          currentText = t;
          currentWidth = w;
        });
      } else {
        currentText = word;
        currentWidth = wordWidth;
      }
    } else {
      const projectedWidth = currentWidth + 1 + wordWidth;

      if (projectedWidth <= availableWidth) {
        currentText += ' ' + word;
        currentWidth = projectedWidth;
      } else {
        lines.push({text: currentText, width: currentWidth});
        currentText = '';
        currentWidth = 0;

        if (wordWidth <= availableWidth) {
          currentText = word;
          currentWidth = wordWidth;
        } else if (canBreakWords) {
          breakWordAt(
            i,
            availableWidth,
            lines,
            graphemeWidths,
            graphemes,
            words,
            widths,
            (t, w) => {
              currentText = t;
              currentWidth = w;
            },
          );
        } else {
          currentText = word;
          currentWidth = wordWidth;
        }
      }
    }
  }

  if (currentText.length > 0 || lines.length === 0) {
    lines.push({text: currentText, width: currentWidth});
  }

  return lines;
}

/**
 * Full path for non-ASCII text with explicit space segments.
 * Spaces are explicit `' '` entries in the words array.
 */
function layoutExplicitSpaces(
  prepared: PreparedText,
  availableWidth: number,
  canBreakWords: boolean,
): TextLine[] {
  const {words, widths, graphemeWidths, graphemes} = prepared;
  const lines: TextLine[] = [];

  let currentText = '';
  let currentWidth = 0;
  let needsSpace = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;

    if (word === ' ') {
      if (currentText.length > 0) {
        needsSpace = true;
      }

      continue;
    }

    const wordWidth = widths[i]!;

    if (currentText.length === 0) {
      if (wordWidth <= availableWidth) {
        currentText = word;
        currentWidth = wordWidth;
      } else if (canBreakWords) {
        breakWordAt(i, availableWidth, lines, graphemeWidths, graphemes, words, widths, (t, w) => {
          currentText = t;
          currentWidth = w;
        });
      } else {
        currentText = word;
        currentWidth = wordWidth;
      }

      needsSpace = false;
      continue;
    }

    const spaceWidth = needsSpace ? 1 : 0;
    const projectedWidth = currentWidth + spaceWidth + wordWidth;

    if (projectedWidth <= availableWidth) {
      currentText += (needsSpace ? ' ' : '') + word;
      currentWidth = projectedWidth;
    } else {
      lines.push({text: currentText, width: currentWidth});
      currentText = '';
      currentWidth = 0;

      if (wordWidth <= availableWidth) {
        currentText = word;
        currentWidth = wordWidth;
      } else if (canBreakWords) {
        breakWordAt(i, availableWidth, lines, graphemeWidths, graphemes, words, widths, (t, w) => {
          currentText = t;
          currentWidth = w;
        });
      } else {
        currentText = word;
        currentWidth = wordWidth;
      }
    }

    needsSpace = false;
  }

  if (currentText.length > 0 || lines.length === 0) {
    lines.push({text: currentText, width: currentWidth});
  }

  return lines;
}

/**
 * Breaks a word at grapheme boundaries using pre-computed widths.
 */
function breakWordAt(
  wordIndex: number,
  availableWidth: number,
  lines: TextLine[],
  graphemeWidths: (number[] | null)[],
  graphemeTexts: (string[] | null)[],
  words: string[],
  wordWidths: number[],
  setCurrent: (text: string, width: number) => void,
): void {
  const gWidths = graphemeWidths[wordIndex];
  const gTexts = graphemeTexts[wordIndex];
  const word = words[wordIndex]!;

  /* If pre-computed grapheme data exists, use it. */
  if (gWidths !== null && gTexts !== null) {
    breakByGraphemeArrays(gTexts, gWidths, availableWidth, lines, setCurrent);
    return;
  }

  /* For ASCII words without pre-computed data, each character is 1 cell.
     Fall back to per-character splitting. */
  if (word.length <= 1) {
    setCurrent(word, wordWidths[wordIndex]!);
    return;
  }

  let lineText = '';
  let lineWidth = 0;

  for (let i = 0; i < word.length; i++) {
    if (lineWidth + 1 > availableWidth && lineText.length > 0) {
      lines.push({text: lineText, width: lineWidth});
      lineText = '';
      lineWidth = 0;
    }

    lineText += word[i]!;
    lineWidth += 1;
  }

  setCurrent(lineText, lineWidth);
}

/**
 * Breaks a word using pre-computed grapheme arrays.
 */
function breakByGraphemeArrays(
  gTexts: string[],
  gWidths: number[],
  availableWidth: number,
  lines: TextLine[],
  setCurrent: (text: string, width: number) => void,
): void {
  let lineText = '';
  let lineWidth = 0;

  for (let g = 0; g < gWidths.length; g++) {
    const gw = gWidths[g]!;

    if (lineWidth + gw > availableWidth && lineText.length > 0) {
      lines.push({text: lineText, width: lineWidth});
      lineText = '';
      lineWidth = 0;
    }

    lineText += gTexts[g]!;
    lineWidth += gw;
  }

  setCurrent(lineText, lineWidth);
}
