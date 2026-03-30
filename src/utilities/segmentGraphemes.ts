/**
 * Segments a string into an array of grapheme clusters.
 */
export function segmentGraphemes(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
  return [...segmenter.segment(text)].map((s) => s.segment);
}
