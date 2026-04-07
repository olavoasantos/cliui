import {GRAPHEME_SEGMENTER} from '../../layout/constants/cellWidth';

/**
 * Segments a string into an array of grapheme clusters.
 */
export function segmentGraphemes(text: string): string[] {
  return [...GRAPHEME_SEGMENTER.segment(text)].map((s) => s.segment);
}
