/** Compares two CSS specificity tuples. */
export function compareSpecificity(
  left: [number, number, number],
  right: [number, number, number],
): number {
  if (left[0] !== right[0]) return left[0] - right[0];
  if (left[1] !== right[1]) return left[1] - right[1];
  return left[2] - right[2];
}
