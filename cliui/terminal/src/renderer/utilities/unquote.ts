/**
 * Strips surrounding quotes from a CSS value string.
 * `"★"` → `★`, `'☆'` → `☆`, `★` → `★`.
 */
export function unquote(value: string): string {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') ||
      (trimmed[0] === "'" && trimmed[trimmed.length - 1] === "'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
