import {graphemeWidth} from '../../layout/utilities/graphemeWidth';
import {cachedComputeVisualLines} from './cachedComputeVisualLines';
import {findLineForCursor} from './findLineForCursor';
import {Caret} from '../classes/Caret';

import type {KeyboardEvent} from '@cliui/dom';
import type {EditableConfiguration} from '../types';
import type {CaretKeyDownOptions} from '../types';
import type {Editable} from '../types';
import type {VisualLine} from '../types';

/**
 * Handles standard editing keyboard shortcuts for a caret.
 *
 * When a {@link EditableConfiguration} is provided via options, supports
 * multi-line navigation (ArrowUp/Down, Enter, per-line Home/End).
 * Without it, behaves as a single-line editor.
 *
 * Returns `true` if the key was handled (caller should stop propagation),
 * `false` if the key should pass through to the component.
 */
export function handleCaretKeyDown(
  caret: Caret,
  event: KeyboardEvent,
  options?: CaretKeyDownOptions,
): boolean {
  const target = caret.target;
  const alt = (event as unknown as {altKey: boolean}).altKey;
  const ctrl = (event as unknown as {ctrlKey: boolean}).ctrlKey;
  const meta = (event as unknown as {metaKey: boolean}).metaKey;
  const shift = (event as unknown as {shiftKey: boolean}).shiftKey;
  const {key} = event;
  const config = options?.config;
  const resolvedWidth = options?.viewportWidth ?? config?.intrinsicWidth() ?? 0;

  if (target.isDisabled()) return false;

  /* ── Multi-line navigation ────────────────────────────── */

  if (config && (key === 'ArrowUp' || key === 'ArrowDown') && !alt && !ctrl && !meta) {
    const lines = cachedComputeVisualLines(
      target.getVisualLineCache(),
      target.getGraphemes(),
      resolvedWidth,
      config.wordWrap,
    );
    const {lineIndex, columnCells} = findCursorLinePosition(target, lines);
    const nextLineIndex = key === 'ArrowUp' ? lineIndex - 1 : lineIndex + 1;

    if (nextLineIndex < 0 || nextLineIndex >= lines.length) return true;

    const pos = mapCellOffsetToGraphemeIndex(lines[nextLineIndex]!, columnCells, target);
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  /* Option+Up/Down: move to previous/next paragraph boundary */
  if (config && (key === 'ArrowUp' || key === 'ArrowDown') && alt && !ctrl && !meta) {
    const graphemes = target.getGraphemes();
    const pos =
      key === 'ArrowUp'
        ? findParagraphBoundaryUp(graphemes, caret.position)
        : findParagraphBoundaryDown(graphemes, caret.position);
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  /* Enter / Shift+Enter: insert newline in multi-line mode */
  if (config?.multiLine && key === 'Enter' && !ctrl && !meta) {
    if (!target.isReadonly()) {
      caret.insertText('\n');
    }

    return true;
  }

  /* ── Navigation (works in readonly too) ───────────────── */

  if (key === 'ArrowLeft' && !alt && !ctrl && !meta) {
    if (shift) { caret.selectTo(caret.position - 1); } else { caret.moveTo(caret.position - 1); }
    return true;
  }

  if (key === 'ArrowRight' && !alt && !ctrl && !meta) {
    if (shift) { caret.selectTo(caret.position + 1); } else { caret.moveTo(caret.position + 1); }
    return true;
  }

  if (key === 'Home' || (key === 'a' && ctrl)) {
    const pos = config ? getLineStart(target, config, caret.position, resolvedWidth) : 0;
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  if (key === 'End' || (key === 'e' && ctrl)) {
    const pos = config
      ? getLineEnd(target, config, caret.position, resolvedWidth)
      : target.getGraphemes().length;
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  /* Word navigation */
  if ((key === 'ArrowLeft' && alt) || (key === 'b' && alt)) {
    const pos = findWordBoundaryLeft(target, caret.position);
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  if ((key === 'ArrowRight' && alt) || (key === 'f' && alt)) {
    const pos = findWordBoundaryRight(target, caret.position);
    if (shift) { caret.selectTo(pos); } else { caret.moveTo(pos); }
    return true;
  }

  /* Char forward/backward: Ctrl+F / Ctrl+B */
  if (key === 'f' && ctrl) {
    if (shift) { caret.selectTo(caret.position + 1); } else { caret.moveTo(caret.position + 1); }
    return true;
  }

  if (key === 'b' && ctrl) {
    if (shift) { caret.selectTo(caret.position - 1); } else { caret.moveTo(caret.position - 1); }
    return true;
  }

  /* Clipboard copy: Ctrl+C or Meta+C (only when selection exists) */
  if (key === 'c' && (ctrl || meta) && !alt && !shift && caret.hasSelection()) {
    options?.onClipboardWrite?.(caret.getSelectedText());
    return true;
  }

  /* Clipboard cut: Ctrl+X or Meta+X (only when selection exists) */
  if (key === 'x' && (ctrl || meta) && !alt && !shift && caret.hasSelection()) {
    options?.onClipboardWrite?.(caret.getSelectedText());

    if (!target.isReadonly()) {
      caret.deleteSelection();
      target.updateScroll();
    }

    return true;
  }

  /* Clipboard paste: Ctrl+V or Meta+V */
  if (key === 'v' && (ctrl || meta) && !alt && !shift) {
    if (!target.isReadonly() && options?.onClipboardRead) {
      const text = options.onClipboardRead();

      if (text.length > 0) {
        caret.insertText(text);
      }
    }

    return true;
  }

  /* ── Editing (blocked by readonly) ────────────────────── */

  if (target.isReadonly()) return false;

  if (key === 'Backspace' && !alt && !ctrl) {
    if (!caret.deleteSelection()) {
      if (caret.position > 0) {
        const pos = caret.position;
        target.deleteRange(pos - 1, pos);
        caret.moveTo(pos - 1);
      }
    }

    target.updateScroll();
    return true;
  }

  if (key === 'Delete' && !alt && !ctrl) {
    if (!caret.deleteSelection()) {
      const graphemes = target.getGraphemes();

      if (caret.position < graphemes.length) {
        target.deleteRange(caret.position, caret.position + 1);
      }
    }

    target.updateScroll();
    return true;
  }

  /* Word delete backward: Alt+Backspace or Ctrl+W */
  if ((key === 'Backspace' && alt) || (key === 'w' && ctrl)) {
    if (!caret.deleteSelection()) {
      const start = findWordBoundaryLeft(target, caret.position);
      target.deleteRange(start, caret.position);
      caret.moveTo(start);
    }

    target.updateScroll();
    return true;
  }

  /* Word delete forward: Alt+Delete or Alt+D */
  if ((key === 'Delete' && alt) || (key === 'd' && alt)) {
    if (!caret.deleteSelection()) {
      const end = findWordBoundaryRight(target, caret.position);
      target.deleteRange(caret.position, end);
    }

    target.updateScroll();
    return true;
  }

  /* Delete to line start: Ctrl+U */
  if (key === 'u' && ctrl) {
    if (!caret.deleteSelection()) {
      const lineStart = config ? getLineStart(target, config, caret.position, resolvedWidth) : 0;
      target.deleteRange(lineStart, caret.position);
      caret.moveTo(lineStart);
    }

    target.updateScroll();
    return true;
  }

  /* Delete to line end: Ctrl+K */
  if (key === 'k' && ctrl) {
    if (!caret.deleteSelection()) {
      const lineEnd = config
        ? getLineEnd(target, config, caret.position, resolvedWidth)
        : target.getGraphemes().length;
      target.deleteRange(caret.position, lineEnd);
    }

    target.updateScroll();
    return true;
  }

  /* Delete forward: Ctrl+D */
  if (key === 'd' && ctrl) {
    if (!caret.deleteSelection()) {
      const graphemes = target.getGraphemes();

      if (caret.position < graphemes.length) {
        target.deleteRange(caret.position, caret.position + 1);
      }
    }

    target.updateScroll();
    return true;
  }

  /* Backspace: Ctrl+H */
  if (key === 'h' && ctrl) {
    if (!caret.deleteSelection()) {
      if (caret.position > 0) {
        const pos = caret.position;
        target.deleteRange(pos - 1, pos);
        caret.moveTo(pos - 1);
      }
    }

    target.updateScroll();
    return true;
  }

  /* Character insertion */
  if (key.length === 1 && !ctrl && !alt && !meta) {
    caret.insertText(key);
    return true;
  }

  return false;
}

/* ── Helpers ─────────────────────────────────────────────── */

function findWordBoundaryLeft(target: Editable, position: number): number {
  const graphemes = target.getGraphemes();
  let index = position - 1;

  while (index > 0 && /^\s$/.test(graphemes[index]!)) {
    index -= 1;
  }

  while (index > 0 && !/^\s$/.test(graphemes[index - 1]!)) {
    index -= 1;
  }

  return Math.max(0, index);
}

function findWordBoundaryRight(target: Editable, position: number): number {
  const graphemes = target.getGraphemes();
  let index = position;

  while (index < graphemes.length && !/^\s$/.test(graphemes[index]!)) {
    index += 1;
  }

  while (index < graphemes.length && /^\s$/.test(graphemes[index]!)) {
    index += 1;
  }

  return index;
}

/**
 * Finds the start of the previous paragraph (before the previous blank line).
 * Moves up past any blank lines, then up past non-blank lines.
 */
function findParagraphBoundaryUp(graphemes: string[], position: number): number {
  let i = position;

  /* Move before the current newline if sitting on one */
  if (i > 0 && graphemes[i - 1] === '\n') i--;

  /* Skip blank lines upward */
  while (i > 0 && graphemes[i - 1] === '\n') i--;

  /* Skip non-newline content upward */
  while (i > 0 && graphemes[i - 1] !== '\n') i--;

  return i;
}

/**
 * Finds the end of the next paragraph (after the next blank line).
 * Moves down past non-blank content, then past any blank lines.
 */
function findParagraphBoundaryDown(graphemes: string[], position: number): number {
  let i = position;
  const len = graphemes.length;

  /* Skip non-newline content downward */
  while (i < len && graphemes[i] !== '\n') i++;

  /* Skip newlines downward */
  while (i < len && graphemes[i] === '\n') i++;

  return i;
}

/**
 * Finds the visual line containing the cursor and the cursor's column
 * offset in terminal cells within that line.
 */
function findCursorLinePosition(
  target: Editable,
  lines: VisualLine[],
): {lineIndex: number; columnCells: number} {
  const cursorPos = target.getCursorPosition();
  const graphemes = target.getGraphemes();
  const lineIndex = findLineForCursor(lines, cursorPos, graphemes);
  const line = lines[lineIndex]!;

  let columnCells = 0;

  for (let j = line.start; j < cursorPos && j < graphemes.length; j++) {
    if (graphemes[j] !== '\n') {
      columnCells += graphemeWidth(graphemes[j]!);
    }
  }

  return {lineIndex, columnCells};
}

/**
 * Maps a cell offset (in terminal cells) to a grapheme index within a
 * visual line, choosing the closest grapheme boundary.
 */
function mapCellOffsetToGraphemeIndex(
  line: VisualLine,
  targetCells: number,
  target: Editable,
): number {
  const graphemes = target.getGraphemes();
  let cells = 0;

  for (let i = line.start; i < line.end && i < graphemes.length; i++) {
    const w = graphemeWidth(graphemes[i]!);

    if (cells + w > targetCells) {
      return i;
    }

    cells += w;
  }

  return line.end;
}

/**
 * Returns the start grapheme index of the visual line containing the cursor.
 */
function getLineStart(
  target: Editable,
  config: EditableConfiguration,
  cursorPos: number,
  width: number,
): number {
  const graphemes = target.getGraphemes();
  const lines = cachedComputeVisualLines(
    target.getVisualLineCache(),
    graphemes,
    width,
    config.wordWrap,
  );
  const lineIndex = findLineForCursor(lines, cursorPos, graphemes);

  return lines[lineIndex]!.start;
}

/**
 * Returns the end grapheme index of the visual line containing the cursor.
 */
function getLineEnd(
  target: Editable,
  config: EditableConfiguration,
  cursorPos: number,
  width: number,
): number {
  const graphemes = target.getGraphemes();
  const lines = cachedComputeVisualLines(
    target.getVisualLineCache(),
    graphemes,
    width,
    config.wordWrap,
  );
  const lineIndex = findLineForCursor(lines, cursorPos, graphemes);

  return lines[lineIndex]!.end;
}
