import {
  EXTENDED_PICTOGRAPHIC_REGEX,
  REGIONAL_INDICATOR_END,
  REGIONAL_INDICATOR_START,
  UNQUALIFIED_KEYCAP_REGEX,
  VS16,
  ZWJ,
} from '../constants/cellWidth';
import {WideGuard} from './WideGuard';

/** Returns whether a grapheme cluster should occupy two cells as emoji. */
export function EmojiPresentationGuard(segment: string): boolean {
  if (segment.length > 50) {
    return false;
  }

  if (UNQUALIFIED_KEYCAP_REGEX.test(segment)) {
    return true;
  }

  const firstCodePoint = segment.codePointAt(0);

  if (
    firstCodePoint !== undefined &&
    firstCodePoint >= REGIONAL_INDICATOR_START &&
    firstCodePoint <= REGIONAL_INDICATOR_END
  ) {
    return true;
  }

  const pictographics = segment.match(EXTENDED_PICTOGRAPHIC_REGEX);

  if (pictographics === null) {
    return false;
  }

  if (segment.includes(ZWJ) && pictographics.length >= 2) {
    return true;
  }

  if (segment.includes(VS16)) {
    return true;
  }

  if (pictographics.length >= 1 && firstCodePoint !== undefined) {
    if (WideGuard(firstCodePoint)) {
      return true;
    }

    if (segment.length > 2) {
      return true;
    }
  }

  return false;
}
