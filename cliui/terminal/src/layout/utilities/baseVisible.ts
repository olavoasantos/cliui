import {LEADING_NON_PRINTING_REGEX} from '../constants/cellWidth';

/** Removes leading non-printing scalars from a grapheme cluster. */
export function baseVisible(segment: string): string {
  return segment.replace(LEADING_NON_PRINTING_REGEX, '');
}
