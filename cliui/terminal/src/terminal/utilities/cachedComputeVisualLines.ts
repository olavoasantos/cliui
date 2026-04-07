import {computeVisualLines} from './computeVisualLines';

import type {VisualLine} from '../types';
import type {VisualLineCache} from '../types';

/**
 * Cached wrapper around {@link computeVisualLines} that avoids redundant
 * recomputation when the inputs have not changed.
 *
 * The cache is keyed by grapheme array identity (reference equality),
 * grapheme count, viewport width, and word-wrap flag. When any of these
 * change the cache is invalidated and visual lines are recomputed.
 *
 * This eliminates the O(n) `computeVisualLines` cost on each call site
 * (handleCaretKeyDown, syncEditableRendering, CaretManager.getOverlays)
 * when only the cursor/selection position changed.
 */
export function cachedComputeVisualLines(
  cache: VisualLineCache,
  graphemes: string[],
  viewportWidth: number,
  wordWrap: boolean,
): VisualLine[] {
  if (
    cache.lines !== null &&
    cache.graphemes === graphemes &&
    cache.graphemeCount === graphemes.length &&
    cache.viewportWidth === viewportWidth &&
    cache.wordWrap === wordWrap
  ) {
    return cache.lines;
  }

  const lines = computeVisualLines(graphemes, viewportWidth, wordWrap);

  cache.graphemes = graphemes;
  cache.graphemeCount = graphemes.length;
  cache.viewportWidth = viewportWidth;
  cache.wordWrap = wordWrap;
  cache.lines = lines;

  return lines;
}
