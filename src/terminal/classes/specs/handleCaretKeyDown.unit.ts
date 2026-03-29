import {describe, expect, it, vi} from 'vitest';

import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Caret} from '../Caret';
import {handleCaretKeyDown} from '../handleCaretKeyDown';

import type {Editable} from '../../types/Editable';

function createEditable(graphemes: string[] = []): Editable & {cursorPos: number} {
  const state = {
    graphemes: [...graphemes],
    cursorPos: 0,
  };

  return {
    ...state,
    getGraphemes: () => state.graphemes,
    getCursorPosition: () => state.cursorPos,
    setCursorPosition: (pos: number) => {
      state.cursorPos = pos;
    },
    insertText: (text: string) => {
      const newGraphemes = [...text];
      state.graphemes.splice(state.cursorPos, 0, ...newGraphemes);
      state.cursorPos += newGraphemes.length;
    },
    deleteRange: (start: number, end: number) => {
      state.graphemes.splice(start, end - start);
    },
    getEditableWidth: () => 20,
    getScrollOffset: () => 0,
    updateScroll: () => {},
    isReadonly: () => false,
    isDisabled: () => false,
    getElement: () => ({}) as any,
  };
}

function createReadonlyEditable(graphemes: string[] = []): Editable & {cursorPos: number} {
  const editable = createEditable(graphemes);
  editable.isReadonly = () => true;
  return editable;
}

function key(
  k: string,
  mods: {ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean} = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
    ctrlKey: mods.ctrl,
    shiftKey: mods.shift,
    altKey: mods.alt,
    metaKey: mods.meta,
  });
}

describe('handleCaretKeyDown clipboard', () => {
  it('copies selected text with Ctrl+C', () => {
    const editable = createEditable(['h', 'e', 'l', 'l', 'o']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(1);
    caret.selectTo(4);

    const handled = handleCaretKeyDown(caret, key('c', {ctrl: true}), {onClipboardWrite});

    expect(handled).toBe(true);
    expect(onClipboardWrite).toHaveBeenCalledWith('ell');
    expect(editable.getGraphemes()).toEqual(['h', 'e', 'l', 'l', 'o']);
  });

  it('copies selected text with Meta+C', () => {
    const editable = createEditable(['a', 'b', 'c']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(0);
    caret.selectTo(2);

    const handled = handleCaretKeyDown(caret, key('c', {meta: true}), {onClipboardWrite});

    expect(handled).toBe(true);
    expect(onClipboardWrite).toHaveBeenCalledWith('ab');
  });

  it('does not handle Ctrl+C when there is no selection', () => {
    const editable = createEditable(['a', 'b']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('c', {ctrl: true}), {onClipboardWrite});

    expect(handled).toBe(false);
    expect(onClipboardWrite).not.toHaveBeenCalled();
  });

  it('cuts selected text with Ctrl+X', () => {
    const editable = createEditable(['h', 'e', 'l', 'l', 'o']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(1);
    caret.selectTo(4);

    const handled = handleCaretKeyDown(caret, key('x', {ctrl: true}), {onClipboardWrite});

    expect(handled).toBe(true);
    expect(onClipboardWrite).toHaveBeenCalledWith('ell');
    expect(editable.getGraphemes()).toEqual(['h', 'o']);
    expect(caret.position).toBe(1);
    expect(caret.hasSelection()).toBe(false);
  });

  it('cuts selected text with Meta+X', () => {
    const editable = createEditable(['a', 'b', 'c', 'd']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(0);
    caret.selectTo(3);

    const handled = handleCaretKeyDown(caret, key('x', {meta: true}), {onClipboardWrite});

    expect(handled).toBe(true);
    expect(onClipboardWrite).toHaveBeenCalledWith('abc');
    expect(editable.getGraphemes()).toEqual(['d']);
  });

  it('does not handle Ctrl+X when there is no selection', () => {
    const editable = createEditable(['a']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    const handled = handleCaretKeyDown(caret, key('x', {ctrl: true}), {onClipboardWrite});

    expect(handled).toBe(false);
    expect(onClipboardWrite).not.toHaveBeenCalled();
  });

  it('copies but does not delete on cut when target is readonly', () => {
    const editable = createReadonlyEditable(['a', 'b', 'c']);
    const caret = new Caret(editable);
    const onClipboardWrite = vi.fn();

    caret.moveTo(0);
    caret.selectTo(2);

    const handled = handleCaretKeyDown(caret, key('x', {ctrl: true}), {onClipboardWrite});

    expect(handled).toBe(true);
    expect(onClipboardWrite).toHaveBeenCalledWith('ab');
    expect(editable.getGraphemes()).toEqual(['a', 'b', 'c']);
  });

  it('handles copy without onClipboardWrite callback', () => {
    const editable = createEditable(['a', 'b']);
    const caret = new Caret(editable);

    caret.moveTo(0);
    caret.selectTo(2);

    const handled = handleCaretKeyDown(caret, key('c', {ctrl: true}));

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a', 'b']);
  });

  it('handles cut without onClipboardWrite callback', () => {
    const editable = createEditable(['a', 'b', 'c']);
    const caret = new Caret(editable);

    caret.moveTo(0);
    caret.selectTo(2);

    const handled = handleCaretKeyDown(caret, key('x', {ctrl: true}));

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['c']);
  });
});
