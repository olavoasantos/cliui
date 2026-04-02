import {FullWidthOrWideGuard} from '../guards/FullWidthOrWideGuard';

/** Measures trailing halfwidth/fullwidth-form scalars after the leading segment. */
export function trailingHalfwidthWidth(segment: string): number {
  let extra = 0;

  if (segment.length > 1) {
    for (const char of segment.slice(1)) {
      if (char >= '\uFF00' && char <= '\uFFEF') {
        const codePoint = char.codePointAt(0)!;
        extra += FullWidthOrWideGuard(codePoint) ? 2 : 1;
      }
    }
  }

  return extra;
}
