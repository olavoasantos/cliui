import {FULLWIDTH_RANGES} from '../constants/cellWidth';
import {codePointInRange} from '../utilities/codePointInRange';

/** Returns whether a code point has East Asian Width category Fullwidth. */
export function FullWidthGuard(codePoint: number): boolean {
  if (codePoint < FULLWIDTH_RANGES[0] || codePoint > FULLWIDTH_RANGES.at(-1)!) {
    return false;
  }

  return codePointInRange(FULLWIDTH_RANGES, codePoint);
}
