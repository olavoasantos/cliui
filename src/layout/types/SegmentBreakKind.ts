/**
 * Classifies how a segment break character behaves during line layout.
 *
 * - `text` — visible content that occupies width.
 * - `space` — collapsible space that acts as a break opportunity.
 * - `glue` — non-breaking joiner that merges with adjacent text.
 * - `zero-width-break` — zero-width break opportunity.
 * - `soft-hyphen` — break opportunity that shows a hyphen when used.
 * - `hard-break` — forced line break.
 */
export type SegmentBreakKind =
  | 'text'
  | 'space'
  | 'glue'
  | 'zero-width-break'
  | 'soft-hyphen'
  | 'hard-break';
