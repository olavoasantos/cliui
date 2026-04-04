/**
 * Parses a CSS time value string into milliseconds.
 *
 * Supports `ms` (milliseconds) and `s` (seconds) suffixes.
 * Returns 0 for invalid or missing values.
 *
 * @param value - A CSS time string like `'200ms'` or `'0.5s'`.
 * @returns The time in milliseconds.
 */
export function parseTimeValue(value: string): number {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.endsWith('ms')) {
    const num = parseFloat(trimmed);
    return Number.isNaN(num) ? 0 : num;
  }

  if (trimmed.endsWith('s')) {
    const num = parseFloat(trimmed);
    return Number.isNaN(num) ? 0 : num * 1000;
  }

  // Bare number — treat as milliseconds
  const num = parseFloat(trimmed);
  return Number.isNaN(num) ? 0 : num;
}
