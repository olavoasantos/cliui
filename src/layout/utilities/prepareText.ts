import {TEXT_LAYOUT_SEGMENTER} from '../constants/segmenter';
import {cellWidth} from './cellWidth';

import type {PreparedText} from '../types/PreparedText';

/**
 * Prepares text for layout by collapsing whitespace, splitting into words,
 * and pre-measuring each word's cell width.
 *
 * This is the expensive one-time phase. The returned {@link PreparedText}
 * can be laid out at any width via {@link layoutPreparedText} using pure
 * arithmetic — no `cellWidth` calls or string splitting needed.
 *
 * @param text - Raw text content to prepare.
 * @returns A prepared text handle, or `null` if the text is empty after
 *   whitespace collapsing.
 */
export function prepareText(text: string): PreparedText | null {
  const collapsed = text.replace(/\s+/g, ' ').trim();

  if (collapsed.length === 0) return null;

  const splitWords = collapsed.split(' ');
  const words: string[] = [];
  const widths: number[] = [];
  const graphemeWidths: (number[] | null)[] = [];
  const graphemes: (string[] | null)[] = [];

  for (const word of splitWords) {
    const w = cellWidth(word);
    words.push(word);
    widths.push(w);

    const gWidths: number[] = [];
    const gTexts: string[] = [];

    for (const {segment} of TEXT_LAYOUT_SEGMENTER.segment(word)) {
      gTexts.push(segment);
      gWidths.push(cellWidth(segment));
    }

    if (gTexts.length > 1) {
      graphemeWidths.push(gWidths);
      graphemes.push(gTexts);
    } else {
      graphemeWidths.push(null);
      graphemes.push(null);
    }
  }

  return {words, widths, graphemeWidths, graphemes};
}
