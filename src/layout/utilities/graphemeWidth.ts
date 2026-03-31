import {PRINTABLE_ASCII_REGEX} from '../constants/cellWidth';
import {EmojiPresentationGuard} from '../guards/EmojiPresentationGuard';
import {FullWidthOrWideGuard} from '../guards/FullWidthOrWideGuard';
import {ZeroWidthClusterGuard} from '../guards/ZeroWidthClusterGuard';
import {baseVisible} from './baseVisible';
import {trailingHalfwidthWidth} from './trailingHalfwidthWidth';

/**
 * Determines the terminal cell width of a single grapheme cluster.
 *
 * Unlike {@link cellWidth}, this function assumes the input is already
 * a single, pre-segmented grapheme cluster with no ANSI escape
 * sequences. This avoids the overhead of `Intl.Segmenter` iteration
 * and ANSI stripping when the caller has already segmented the string.
 *
 * Width rules per grapheme cluster:
 * 1. Non-printing clusters (Default_Ignorable, Control, Format, Mark, Surrogate) → 0
 * 2. Emoji sequences (pictographic with presentation or ZWJ sequences) → 2
 * 3. East Asian Fullwidth or Wide code points → 2
 * 4. Everything else → 1
 *
 * @param segment - A single grapheme cluster to measure.
 * @returns The terminal cell width (0, 1, or 2).
 */
export function graphemeWidth(segment: string): number {
  if (segment.length === 0) {
    return 0;
  }

  /* Fast path: single printable ASCII character is always width 1. */
  if (segment.length === 1) {
    const code = segment.charCodeAt(0);

    if (code >= 0x20 && code <= 0x7e) {
      return 1;
    }
  }

  /* Fast path: pure printable ASCII string (rare for a single grapheme
     but possible with combining-mark clusters that only contain ASCII). */
  if (PRINTABLE_ASCII_REGEX.test(segment)) {
    return segment.length;
  }

  if (ZeroWidthClusterGuard(segment)) {
    return 0;
  }

  if (EmojiPresentationGuard(segment)) {
    return 2;
  }

  const visible = baseVisible(segment);
  const codePoint = visible.codePointAt(0);
  let width = 0;

  if (codePoint !== undefined) {
    width += FullWidthOrWideGuard(codePoint) ? 2 : 1;
  }

  width += trailingHalfwidthWidth(segment);

  return width;
}
