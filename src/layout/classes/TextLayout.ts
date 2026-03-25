import {cellWidth} from '../utilities/cellWidth';

import type {TextLayoutOptions, TextLine} from '../types';

const segmenter = new Intl.Segmenter();

/**
 * Measures text and performs word wrapping for terminal layout.
 *
 * Supports the milestone text layout modes: `white-space: normal`, `nowrap`,
 * `pre`, and `pre-wrap`, plus `text-overflow: clip | ellipsis` for unwrapped
 * content.
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
      return [{text: '', width: 0}];
    }

    const effectiveWidth = Math.max(1, Math.floor(availableWidth));
    const whiteSpace = options.whiteSpace ?? 'normal';
    const textOverflow = options.textOverflow ?? 'clip';

    switch (whiteSpace) {
      case 'nowrap':
        return [this.truncateIfNeeded(this.collapseWhitespace(text), effectiveWidth, textOverflow)];
      case 'pre':
        return this.measurePre(text, effectiveWidth, textOverflow);
      case 'pre-wrap':
        return this.measurePreWrap(text, effectiveWidth);
      case 'normal':
      default:
        return this.measureNormal(text, effectiveWidth);
    }
  }

  /**
   * Measures `white-space: normal` text.
   */
  private measureNormal(text: string, availableWidth: number): TextLine[] {
    const collapsed = this.collapseWhitespace(text);

    if (collapsed.length === 0) {
      return [{text: '', width: 0}];
    }

    const words = collapsed.split(' ');
    const lines: TextLine[] = [];

    let currentText = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = cellWidth(word);

      if (currentText.length === 0) {
        if (wordWidth <= availableWidth) {
          currentText = word;
          currentWidth = wordWidth;
        } else {
          this.breakWord(word, availableWidth, lines, (nextText, nextWidth) => {
            currentText = nextText;
            currentWidth = nextWidth;
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
            this.breakWord(word, availableWidth, lines, (nextText, nextWidth) => {
              currentText = nextText;
              currentWidth = nextWidth;
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
    const logicalLines = text.split('\n');
    const measuredLines: TextLine[] = [];

    for (const logicalLine of logicalLines) {
      if (logicalLine.length === 0) {
        measuredLines.push({text: '', width: 0});
        continue;
      }

      let currentText = '';
      let currentWidth = 0;

      for (const {segment} of segmenter.segment(logicalLine)) {
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

    for (const {segment} of segmenter.segment(text)) {
      const graphemeWidth = cellWidth(segment);

      if (clippedWidth + graphemeWidth > availableWidth) {
        break;
      }

      clippedText += segment;
      clippedWidth += graphemeWidth;
    }

    return {text: clippedText, width: clippedWidth};
  }

  /**
   * Collapses whitespace according to `white-space: normal|nowrap` semantics.
   */
  private collapseWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
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

    setCurrent(lineText, lineWidth);
  }
}
