/** Returns whether a code point is contained in a sorted range table. */
export function codePointInRange(ranges: readonly number[], codePoint: number): boolean {
  let low = 0;
  let high = Math.floor(ranges.length / 2) - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const index = mid * 2;

    if (codePoint < ranges[index]!) {
      high = mid - 1;
    } else if (codePoint > ranges[index + 1]!) {
      low = mid + 1;
    } else {
      return true;
    }
  }

  return false;
}
