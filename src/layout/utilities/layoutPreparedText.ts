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
 * @returns An array of text lines.
 */
export function layoutPreparedText(prepared: PreparedText, availableWidth: number): TextLine[] {
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
      } else {
        breakWord(i, availableWidth, lines, graphemeWidths, graphemes, words, widths, (t, w) => {
          currentText = t;
          currentWidth = w;
        });
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
        } else {
          breakWord(i, availableWidth, lines, graphemeWidths, graphemes, words, widths, (t, w) => {
            currentText = t;
            currentWidth = w;
          });
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
 * Breaks a word at grapheme boundaries using pre-computed widths.
 */
function breakWord(
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

  /* If no per-grapheme data, the word is a single grapheme — place as-is. */
  if (gWidths === null || gTexts === null) {
    setCurrent(words[wordIndex]!, wordWidths[wordIndex]!);
    return;
  }

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
