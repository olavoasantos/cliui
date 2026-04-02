import {WIDE_FAST_END, WIDE_FAST_START, WIDE_RANGES} from '../constants/cellWidth';
import {codePointInRange} from '../utilities/codePointInRange';

/** Returns whether a code point has East Asian Width category Wide. */
export function WideGuard(codePoint: number): boolean {
  if (codePoint >= WIDE_FAST_START && codePoint <= WIDE_FAST_END) {
    return true;
  }

  if (codePoint < WIDE_RANGES[0] || codePoint > WIDE_RANGES.at(-1)!) {
    return false;
  }

  return codePointInRange(WIDE_RANGES, codePoint);
}
