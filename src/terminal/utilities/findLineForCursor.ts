import type {VisualLine} from '../types/VisualLine';

/**
 * Finds the visual line index containing a given cursor position.
 *
 * Correctly handles:
 * - Empty lines (start === end) — cursor at that position belongs to the line
 * - Newline boundaries — cursor at line.end (before `\n`) belongs to the current line
 * - Wrap boundaries — cursor at line.end (not a `\n`) belongs to the next line
 * - Last line — always claims the end-of-content position
 *
 * @param lines - The visual lines produced by {@link computeVisualLines}.
 * @param cursorPos - The flat grapheme index of the cursor.
 * @param graphemes - The flat grapheme array.
 * @returns The zero-based visual line index containing the cursor.
 */
export function findLineForCursor(
  lines: VisualLine[],
  cursorPos: number,
  graphemes: string[],
): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (cursorPos < line.start) continue;
    if (cursorPos < line.end) return i;
    if (cursorPos > line.end) continue;

    /* cursorPos === line.end */
    if (i === lines.length - 1) return i;
    if (line.end < graphemes.length && graphemes[line.end] === '\n') return i;

    /* Wrap boundary — cursor belongs to the next line */
  }

  return lines.length - 1;
}
