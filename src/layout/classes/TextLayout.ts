import {TEXT_LAYOUT_SEGMENTER} from '../constants/segmenter';
import {cellWidth} from '../utilities/cellWidth';
import {layoutPreparedText} from '../utilities/layoutPreparedText';
import {normalizeWhitespaceNormal} from '../utilities/normalizeWhitespaceNormal';
import {normalizeWhitespacePreWrap} from '../utilities/normalizeWhitespacePreWrap';
import {prepareText} from '../utilities/prepareText';

import type {TextLayoutOptions, TextLine} from '../types';

/**
 * Measures text and performs word wrapping for terminal layout.
 *
 * For `white-space: normal`, uses a two-phase prepare/layout architecture:
 * the prepare phase (whitespace collapsing, word splitting, cell-width
 * measurement) runs once per text content change, and the layout phase
 * (pure arithmetic on cached widths) runs on every width change.
 *
 * Supports `white-space: normal`, `nowrap`, `pre`, and `pre-wrap`, plus
 * `text-overflow: clip | ellipsis` for unwrapped content.
 */
export class TextLayout {
  /**
   * Measures the given text and wraps it to fit within `availableWidth`.
   *
   * @param text - The text content to measure and wrap.
   * @param availableWidth - The maximum terminal cell width per line. Must be
   *   at least 1.
   * @param options - Text layout options derived from computed style.
   * @returns An array of {@link TextLine} objects, one per measured line.
   */
  measure(text: string, availableWidth: number, options: TextLayoutOptions = {}): TextLine[] {
    if (text.length === 0) {
      return [];
    }

    const effectiveWidth = Math.max(1, Math.floor(availableWidth));
    const whiteSpace = options.whiteSpace ?? 'normal';
    const textOverflow = options.textOverflow ?? 'clip';

    switch (whiteSpace) {
      case 'nowrap':
        return [
          this.truncateIfNeeded(normalizeWhitespaceNormal(text), effectiveWidth, textOverflow),
        ];
      case 'pre':
        return this.measurePre(text, effectiveWidth, textOverflow);
      case 'pre-wrap':
        return this.measurePreWrap(text, effectiveWidth);
      case 'normal':
      default:
        return this.measureNormal(text, effectiveWidth, options);
    }
  }

  /**
   * Measures `white-space: normal` text using the two-phase architecture.
   */
  private measureNormal(
    text: string,
    availableWidth: number,
    options: TextLayoutOptions,
  ): TextLine[] {
    const prepared = prepareText(text);

    if (prepared === null) {
      return [];
    }

    const canBreakWords = (options.overflowWrap ?? 'break-word') === 'break-word';

    return layoutPreparedText(prepared, availableWidth, canBreakWords);
  }

  /**
   * Measures `white-space: pre` text.
   */
  private measurePre(
    text: string,
    availableWidth: number,
    textOverflow: 'clip' | 'ellipsis',
  ): TextLine[] {
    const lines = text
      .split('\n')
      .map((line) => this.truncateIfNeeded(line, availableWidth, textOverflow));

    return lines.length > 0 ? lines : [{text: '', width: 0}];
  }

  /**
   * Measures `white-space: pre-wrap` text.
   */
  private measurePreWrap(text: string, availableWidth: number): TextLine[] {
    const normalized = normalizeWhitespacePreWrap(text);
    const logicalLines = normalized.split('\n');
    const measuredLines: TextLine[] = [];

    for (const logicalLine of logicalLines) {
      if (logicalLine.length === 0) {
        measuredLines.push({text: '', width: 0});
        continue;
      }

      let currentText = '';
      let currentWidth = 0;

      for (const {segment} of TEXT_LAYOUT_SEGMENTER.segment(logicalLine)) {
        const graphemeWidth = cellWidth(segment);

        if (currentWidth + graphemeWidth > availableWidth && currentText.length > 0) {
          measuredLines.push({text: currentText, width: currentWidth});
          currentText = '';
          currentWidth = 0;
        }

        currentText += segment;
        currentWidth += graphemeWidth;
      }

      measuredLines.push({text: currentText, width: currentWidth});
    }

    return measuredLines.length > 0 ? measuredLines : [{text: '', width: 0}];
  }

  /**
   * Truncates a line when `text-overflow: ellipsis` applies.
   */
  private truncateIfNeeded(
    text: string,
    availableWidth: number,
    textOverflow: 'clip' | 'ellipsis',
  ): TextLine {
    const width = cellWidth(text);

    if (width <= availableWidth || textOverflow === 'clip') {
      return this.clipToWidth(text, availableWidth);
    }

    if (availableWidth <= 0) {
      return {text: '', width: 0};
    }

    if (availableWidth === 1) {
      return {text: '…', width: 1};
    }

    const clipped = this.clipToWidth(text, availableWidth - 1);

    return {
      text: clipped.text + '…',
      width: clipped.width + 1,
    };
  }

  /**
   * Clips text to a maximum width without adding an ellipsis.
   */
  private clipToWidth(text: string, availableWidth: number): TextLine {
    let clippedText = '';
    let clippedWidth = 0;

    for (const {segment} of TEXT_LAYOUT_SEGMENTER.segment(text)) {
      const graphemeWidth = cellWidth(segment);

      if (clippedWidth + graphemeWidth > availableWidth) {
        break;
      }

      clippedText += segment;
      clippedWidth += graphemeWidth;
    }

    return {text: clippedText, width: clippedWidth};
  }
}
