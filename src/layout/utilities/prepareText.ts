import {TEXT_LAYOUT_SEGMENTER} from '../constants/segmenter';
import {WORD_SEGMENTER} from '../constants/wordSegmenter';
import {KINSOKU_END, KINSOKU_START, LEFT_STICKY_PUNCTUATION} from '../constants/kinsoku';
import {cellWidth} from './cellWidth';
import {classifyBreakKind} from './classifyBreakKind';
import {isAsciiText} from './isAsciiText';
import {isCJK} from './isCJK';
import {mergeNumericRuns} from './mergeNumericRuns';
import {mergeUrlRuns} from './mergeUrlRuns';
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

    /* Check for special break characters (NBSP, ZWSP, soft-hyphen). */
    if (segment.length === 1) {
      const breakKind = classifyBreakKind(segment);

      if (breakKind === 'glue') {
        /* Glue characters (NBSP, NNBSP, word joiner) merge with adjacent
           text — do not emit a space, just concatenate with next word. */
        if (needsSpace) {
          needsSpace = false;
        }

        /* Merge with the previous word if there is one. */
        if (words.length > 0 && words[words.length - 1] !== ' ') {
          words[words.length - 1] += segment;
          widths[words.length - 1]! += cellWidth(segment);
          graphemeWidths[words.length - 1] = null;
          graphemes[words.length - 1] = null;
        } else {
          /* Glue at the start — store it, will merge with next word. */
          if (needsSpace) {
            words.push(' ');
            widths.push(1);
            graphemeWidths.push(null);
            graphemes.push(null);
            needsSpace = false;
          }

          words.push(segment);
          widths.push(cellWidth(segment));
          graphemeWidths.push(null);
          graphemes.push(null);
        }

        continue;
      }

      if (breakKind === 'zero-width-break') {
        /* ZWSP is a break opportunity with zero width. Emit pending
           space if any, then continue — the break point is implicit
           between the previous and next segments. */
        if (needsSpace) {
          words.push(' ');
          widths.push(1);
          graphemeWidths.push(null);
          graphemes.push(null);
          needsSpace = false;
        }

        /* Emit a zero-width space segment that acts as break opportunity. */
        words.push(' ');
        widths.push(0);
        graphemeWidths.push(null);
        graphemes.push(null);
        continue;
      }

      if (breakKind === 'soft-hyphen') {
        /* Soft hyphens are invisible — skip them. When a break occurs
           at a soft-hyphen position, the layout phase would add a visible
           hyphen. For now, treat as invisible content. */
        continue;
      }
    }

    /* If there's a pending space, emit it as a space word. */
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

  mergeUrlRuns(words, widths, graphemeWidths, graphemes);
  mergeNumericRuns(words, widths, graphemeWidths, graphemes);
  applyPunctuationAttachment(words, widths, graphemeWidths, graphemes);

  return {words, widths, graphemeWidths, graphemes, hasExplicitSpaces: true};
}

/**
 * Merges punctuation segments with adjacent words to prevent typographically
 * incorrect line breaks. Modifies the arrays in-place.
 *
 * Pass 1: left-sticky and kinsoku-start punctuation merges backward.
 * Pass 2: kinsoku-end (opening brackets/quotes) merges forward.
 */
function applyPunctuationAttachment(
  words: string[],
  widths: number[],
  graphemeWidths: (number[] | null)[],
  graphemes: (string[] | null)[],
): void {
  /* Pass 1: merge left-sticky / kinsoku-start backward. */
  for (let i = words.length - 1; i > 0; i--) {
    const word = words[i]!;

    if (word === ' ') continue;

    const firstChar = word[0]!;

    if (!LEFT_STICKY_PUNCTUATION.has(firstChar) && !KINSOKU_START.has(firstChar)) continue;

    /* Find the nearest preceding non-space segment. */
    let target = -1;

    for (let j = i - 1; j >= 0; j--) {
      if (words[j] === ' ') continue;
      target = j;
      break;
    }

    if (target === -1) continue;

    /* Merge everything from target to i (inclusive) into target. */
    let mergedText = words[target]!;
    let mergedWidth = widths[target]!;

    for (let k = target + 1; k <= i; k++) {
      mergedText += words[k]!;
      mergedWidth += widths[k]!;
    }

    words[target] = mergedText;
    widths[target] = mergedWidth;
    graphemeWidths[target] = null;
    graphemes[target] = null;
    words.splice(target + 1, i - target);
    widths.splice(target + 1, i - target);
    graphemeWidths.splice(target + 1, i - target);
    graphemes.splice(target + 1, i - target);
    i = target;
  }

  /* Pass 2: merge kinsoku-end (opening brackets/quotes) forward. */
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i]!;

    if (word === ' ') continue;

    const lastChar = word[word.length - 1]!;

    if (!KINSOKU_END.has(lastChar)) continue;

    /* Find the nearest following non-space segment. */
    let target = -1;

    for (let j = i + 1; j < words.length; j++) {
      if (words[j] === ' ') continue;
      target = j;
      break;
    }

    if (target === -1) continue;

    /* Merge everything from i to target (inclusive) into i. */
    let mergedText = word;
    let mergedWidth = widths[i]!;

    for (let k = i + 1; k <= target; k++) {
      mergedText += words[k]!;
      mergedWidth += widths[k]!;
    }

    words[i] = mergedText;
    widths[i] = mergedWidth;
    graphemeWidths[i] = null;
    graphemes[i] = null;
    words.splice(i + 1, target - i);
    widths.splice(i + 1, target - i);
    graphemeWidths.splice(i + 1, target - i);
    graphemes.splice(i + 1, target - i);
  }
}
