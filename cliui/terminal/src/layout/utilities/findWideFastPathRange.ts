/** Returns the fast-path range used by wide code-point checks. */
export function findWideFastPathRange(
  ranges: readonly number[],
  commonCodePoint: number,
): [number, number] {
  let fastStart = ranges[0]!;
  let fastEnd = ranges[1]!;

  for (let index = 0; index < ranges.length; index += 2) {
    const start = ranges[index]!;
    const end = ranges[index + 1]!;

    if (commonCodePoint >= start && commonCodePoint <= end) {
      return [start, end];
    }

    if (end - start > fastEnd - fastStart) {
      fastStart = start;
      fastEnd = end;
    }
  }

  return [fastStart, fastEnd];
}
