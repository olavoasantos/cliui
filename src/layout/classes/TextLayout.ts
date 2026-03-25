import {cellWidth} from '../utilities/cellWidth';

import type {TextLine} from '../types';

const segmenter = new Intl.Segmenter();

/**
 * Measures text and performs word wrapping for terminal layout.
 *
 * Splits text into lines that fit within a given available width, measuring
 * each grapheme cluster using {@link cellWidth}. Currently implements
 * `white-space: normal` semantics — consecutive whitespace is collapsed and
 * text wraps at word boundaries. Additional `white-space` modes (`nowrap`,
 * `pre`, `pre-wrap`) are deferred to Phase 2.
 */
export class TextLayout {
  /**
   * Measures the given text and wraps it to fit within `availableWidth`.
   *
   * Words are split at whitespace boundaries. When a single word is wider
   * than `availableWidth`, it is broken at grapheme boundaries to fit.
   * Consecutive whitespace is collapsed to a single space (matching
   * `white-space: normal` behavior).
   *
   * @param text - The text content to measure and wrap.
   * @param availableWidth - The maximum terminal cell width per line. Must be
   *   at least 1.
   * @returns An array of {@link TextLine} objects, one per wrapped line.
   */
  measure(text: string, availableWidth: number): TextLine[] {
    if (text.length === 0) {
      return [{text: '', width: 0}];
    }

    const effectiveWidth = Math.max(1, Math.floor(availableWidth));

    // Collapse whitespace (white-space: normal semantics)
    const collapsed = text.replace(/\s+/g, ' ').trim();

    if (collapsed.length === 0) {
      return [{text: '', width: 0}];
    }

    const words = collapsed.split(' ');
    const lines: TextLine[] = [];

    let currentText = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = cellWidth(word);

      // Word fits on the current line (with a space separator if needed)
      if (currentText.length === 0) {
        // First word on the line
        if (wordWidth <= effectiveWidth) {
          currentText = word;
          currentWidth = wordWidth;
        } else {
          // Word is wider than available width — break by grapheme
          this.breakWord(word, effectiveWidth, lines, (t, w) => {
            currentText = t;
            currentWidth = w;
          });
        }
      } else {
        // Not the first word — need a space before it
        const spaceWidth = 1;
        const projectedWidth = currentWidth + spaceWidth + wordWidth;

        if (projectedWidth <= effectiveWidth) {
          currentText += ' ' + word;
          currentWidth = projectedWidth;
        } else {
          // Flush the current line and start a new one
          lines.push({text: currentText, width: currentWidth});
          currentText = '';
          currentWidth = 0;

          if (wordWidth <= effectiveWidth) {
            currentText = word;
            currentWidth = wordWidth;
          } else {
            // Word wider than available width — break by grapheme
            this.breakWord(word, effectiveWidth, lines, (t, w) => {
              currentText = t;
              currentWidth = w;
            });
          }
        }
      }
    }

    // Flush the last line
    if (currentText.length > 0 || lines.length === 0) {
      lines.push({text: currentText, width: currentWidth});
    }

    return lines;
  }

  /**
   * Breaks a word that exceeds `availableWidth` into multiple lines at
   * grapheme boundaries.
   */
  private breakWord(
    word: string,
    availableWidth: number,
    lines: TextLine[],
    setCurrent: (text: string, width: number) => void,
  ): void {
    let lineText = '';
    let lineWidth = 0;

    for (const {segment} of segmenter.segment(word)) {
      const graphemeWidth = cellWidth(segment);

      if (lineWidth + graphemeWidth > availableWidth && lineText.length > 0) {
        lines.push({text: lineText, width: lineWidth});
        lineText = '';
        lineWidth = 0;
      }

      lineText += segment;
      lineWidth += graphemeWidth;
    }

    // The remaining fragment becomes the current line (not flushed yet,
    // because more words might fit after it)
    setCurrent(lineText, lineWidth);
  }
}
