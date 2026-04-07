import type {SegmentBreakKind} from '../types';

/**
 * Classifies a character into a segment break kind for line-breaking.
 *
 * @param ch - A single character to classify.
 * @returns The segment break kind for the character.
 */
export function classifyBreakKind(ch: string): SegmentBreakKind {
  if (ch === ' ') return 'space';
  if (ch === '\u00A0' || ch === '\u202F' || ch === '\u2060' || ch === '\uFEFF') return 'glue';
  if (ch === '\u200B') return 'zero-width-break';
  if (ch === '\u00AD') return 'soft-hyphen';

  return 'text';
}
