import {Caret} from './Caret';

import type {KeyboardEvent} from '../../dom/classes/KeyboardEvent';
import type {Editable} from '../types/Editable';

/**
 * Handles standard editing keyboard shortcuts for a caret.
 *
 * Returns `true` if the key was handled (caller should stop propagation),
 * `false` if the key should pass through to the component.
 */
export function handleCaretKeyDown(caret: Caret, event: KeyboardEvent): boolean {
  const target = caret.target;
  const alt = (event as unknown as {altKey: boolean}).altKey;
  const ctrl = (event as unknown as {ctrlKey: boolean}).ctrlKey;
  const meta = (event as unknown as {metaKey: boolean}).metaKey;
  const shift = (event as unknown as {shiftKey: boolean}).shiftKey;
  const {key} = event;

  if (target.isDisabled()) return false;

  /* Navigation (works in readonly too) */
  if (key === 'ArrowLeft' && !alt && !ctrl && !meta) {
    shift ? caret.selectTo(caret.position - 1) : caret.moveTo(caret.position - 1);
    return true;
  }

  if (key === 'ArrowRight' && !alt && !ctrl && !meta) {
    shift ? caret.selectTo(caret.position + 1) : caret.moveTo(caret.position + 1);
    return true;
  }

  if (key === 'Home' || (key === 'a' && ctrl)) {
    shift ? caret.selectTo(0) : caret.moveTo(0);
    return true;
  }

  if (key === 'End' || (key === 'e' && ctrl)) {
    const end = target.getGraphemes().length;
    shift ? caret.selectTo(end) : caret.moveTo(end);
    return true;
  }

  /* Word navigation */
  if ((key === 'ArrowLeft' && alt) || (key === 'b' && alt)) {
    const pos = findWordBoundaryLeft(target, caret.position);
    shift ? caret.selectTo(pos) : caret.moveTo(pos);
    return true;
  }

  if ((key === 'ArrowRight' && alt) || (key === 'f' && alt)) {
    const pos = findWordBoundaryRight(target, caret.position);
    shift ? caret.selectTo(pos) : caret.moveTo(pos);
    return true;
  }

  /* Char forward/backward: Ctrl+F / Ctrl+B */
  if (key === 'f' && ctrl) {
    shift ? caret.selectTo(caret.position + 1) : caret.moveTo(caret.position + 1);
    return true;
  }

  if (key === 'b' && ctrl) {
    shift ? caret.selectTo(caret.position - 1) : caret.moveTo(caret.position - 1);
    return true;
  }

  /* Editing (blocked by readonly) */
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
      target.deleteRange(0, caret.position);
      caret.moveTo(0);
    }

    target.updateScroll();
    return true;
  }

  /* Delete to line end: Ctrl+K */
  if (key === 'k' && ctrl) {
    if (!caret.deleteSelection()) {
      target.deleteRange(caret.position, target.getGraphemes().length);
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
