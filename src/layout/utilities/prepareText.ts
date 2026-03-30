import {TEXT_LAYOUT_SEGMENTER} from '../constants/segmenter';
import {WORD_SEGMENTER} from '../constants/wordSegmenter';
import {cellWidth} from './cellWidth';
import {isAsciiText} from './isAsciiText';
import {isCJK} from './isCJK';
import {normalizeWhitespaceNormal} from './normalizeWhitespaceNormal';

import type {PreparedText} from '../types/PreparedText';

/**
 * Prepares text for layout by collapsing whitespace, splitting into words,
 * and pre-measuring each word's cell width.
 *
 * This is the expensive one-time phase. The returned {@link PreparedText}
 * can be laid out at any width via {@link layoutPreparedText} using pure
 * arithmetic — no `cellWidth` calls or string splitting needed.
 *
 * Uses a fast path for pure-ASCII text that avoids `cellWidth` and
 * `Intl.Segmenter` entirely. Non-ASCII text uses `Intl.Segmenter` with
 * word-boundary granularity and splits CJK segments into per-grapheme
 * break units.
 *
 * @param text - Raw text content to prepare.
 * @returns A prepared text handle, or `null` if the text is empty after
 *   whitespace collapsing.
 */
export function prepareText(text: string): PreparedText | null {
  const collapsed = normalizeWhitespaceNormal(text);

  if (collapsed.length === 0) return null;

  if (isAsciiText(collapsed)) {
    return prepareAscii(collapsed.split(' '));
  }

  return prepareFull(collapsed);
}

/**
 * Fast path for pure-ASCII text. Each character is 1 cell, each character
 * is its own grapheme — no `cellWidth` or segmenter needed.
 */
function prepareAscii(splitWords: string[]): PreparedText {
  const words: string[] = splitWords;
  const widths: number[] = [];
  const graphemeWidths: (number[] | null)[] = [];
  const graphemes: (string[] | null)[] = [];

  for (let i = 0; i < splitWords.length; i++) {
    widths.push(splitWords[i]!.length);
    graphemeWidths.push(null);
    graphemes.push(null);
  }

  return {words, widths, graphemeWidths, graphemes, hasExplicitSpaces: false};
}

/**
 * Full path for non-ASCII text. Uses `Intl.Segmenter` for word-boundary
 * detection, splits CJK segments into per-grapheme break units, and
 * measures everything with `cellWidth`.
 */
function prepareFull(collapsed: string): PreparedText {
  const words: string[] = [];
  const widths: number[] = [];
  const graphemeWidths: (number[] | null)[] = [];
  const graphemes: (string[] | null)[] = [];

  let needsSpace = false;

  for (const seg of WORD_SEGMENTER.segment(collapsed)) {
    const segment = seg.segment;

    /* Space segments are break opportunities — we track them as a flag
       and insert them into the word list when the next word arrives. */
    if (segment === ' ') {
      if (words.length > 0) {
        needsSpace = true;
      }

      continue;
    }

    /* If there's a pending space, emit it as a space word. The layout
       phase uses space words to decide where line breaks can happen. */
    if (needsSpace) {
      words.push(' ');
      widths.push(1);
      graphemeWidths.push(null);
      graphemes.push(null);
      needsSpace = false;
    }

    /* CJK text: split into per-grapheme break units so each character
       can independently start a new line. */
    if (isCJK(segment)) {
      for (const g of TEXT_LAYOUT_SEGMENTER.segment(segment)) {
        const grapheme = g.segment;
        const w = cellWidth(grapheme);
        words.push(grapheme);
        widths.push(w);
        graphemeWidths.push(null);
        graphemes.push(null);
      }

      continue;
    }

    /* Regular non-ASCII word. */
    const w = cellWidth(segment);
    words.push(segment);
    widths.push(w);

    const gWidths: number[] = [];
    const gTexts: string[] = [];

    for (const {segment: grapheme} of TEXT_LAYOUT_SEGMENTER.segment(segment)) {
      gTexts.push(grapheme);
      gWidths.push(cellWidth(grapheme));
    }

    if (gTexts.length > 1) {
      graphemeWidths.push(gWidths);
      graphemes.push(gTexts);
    } else {
      graphemeWidths.push(null);
      graphemes.push(null);
    }
  }

  return {words, widths, graphemeWidths, graphemes, hasExplicitSpaces: true};
}
