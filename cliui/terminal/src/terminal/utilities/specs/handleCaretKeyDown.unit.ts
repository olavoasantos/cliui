import {describe, expect, it, vi} from 'vitest';

import {KeyboardEvent} from '@cliui/dom';
import {Caret} from '../../classes/Caret';
import {handleCaretKeyDown} from '../handleCaretKeyDown';

import type {Editable} from '../../types/Editable';
import {createVisualLineCache} from '../cachedComputeVisualLines';

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
    getScrollY: () => 0,
    updateScroll: () => {},
    isReadonly: () => false,
    isDisabled: () => false,
    getElement: () => ({}) as any,
    getVisualLineCache: () => createVisualLineCache(),
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

  it('pastes from clipboard with Ctrl+V', () => {
    const editable = createEditable(['a', 'b']);
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('v', {ctrl: true}), {
      onClipboardRead: () => 'XY',
    });

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a', 'X', 'Y', 'b']);
    expect(caret.position).toBe(3);
  });

  it('pastes from clipboard with Meta+V', () => {
    const editable = createEditable(['a']);
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('v', {meta: true}), {
      onClipboardRead: () => 'Z',
    });

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a', 'Z']);
  });

  it('replaces selection on paste', () => {
    const editable = createEditable(['a', 'b', 'c', 'd']);
    const caret = new Caret(editable);

    caret.moveTo(1);
    caret.selectTo(3);

    const handled = handleCaretKeyDown(caret, key('v', {ctrl: true}), {
      onClipboardRead: () => 'X',
    });

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a', 'X', 'd']);
    expect(caret.hasSelection()).toBe(false);
  });

  it('does not paste when target is readonly', () => {
    const editable = createReadonlyEditable(['a', 'b']);
    const caret = new Caret(editable);
    const onClipboardRead = vi.fn(() => 'X');

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('v', {ctrl: true}), {onClipboardRead});

    expect(handled).toBe(true);
    expect(onClipboardRead).not.toHaveBeenCalled();
    expect(editable.getGraphemes()).toEqual(['a', 'b']);
  });

  it('does not paste when clipboard is empty', () => {
    const editable = createEditable(['a']);
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('v', {ctrl: true}), {
      onClipboardRead: () => '',
    });

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a']);
  });

  it('handles Ctrl+V without onClipboardRead callback', () => {
    const editable = createEditable(['a']);
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('v', {ctrl: true}));

    expect(handled).toBe(true);
    expect(editable.getGraphemes()).toEqual(['a']);
  });
});

describe('handleCaretKeyDown multiline', () => {
  const multiLineConfig = {
    intrinsicWidth: () => 20,
    intrinsicHeight: () => 5,
    wordWrap: false,
    multiLine: true,
  };

  function g(text: string): string[] {
    return [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(text)].map(
      (s) => s.segment,
    );
  }

  it('inserts a newline on Enter', () => {
    const editable = createEditable(g('ab'));
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('Enter'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(editable.getGraphemes().join('')).toBe('a\nb');
    expect(caret.position).toBe(2);
  });

  it('does not insert a newline when multiLine is false', () => {
    const editable = createEditable(g('ab'));
    const caret = new Caret(editable);
    const singleLineConfig = {...multiLineConfig, multiLine: false};

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('Enter'), {config: singleLineConfig});

    expect(handled).toBe(false);
  });

  it('navigates down with ArrowDown', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(1); // on 'b' in line 0

    const handled = handleCaretKeyDown(caret, key('ArrowDown'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(5); // 'e' in line 1
  });

  it('navigates up with ArrowUp', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(5); // on 'e' in line 1

    const handled = handleCaretKeyDown(caret, key('ArrowUp'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(1); // 'b' in line 0
  });

  it('clamps ArrowDown at the last line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(5);

    const handled = handleCaretKeyDown(caret, key('ArrowDown'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(5); // unchanged
  });

  it('clamps ArrowUp at the first line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('ArrowUp'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(1); // unchanged
  });

  it('moves Home to start of current line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(6); // on 'f' in line 1

    const handled = handleCaretKeyDown(caret, key('Home'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(4); // start of line 1
  });

  it('moves End to end of current line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(4); // start of line 1

    const handled = handleCaretKeyDown(caret, key('End'), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(caret.position).toBe(7); // end of line 1
  });

  it('Ctrl+U deletes to start of current line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(6); // on 'f' in line 1

    const handled = handleCaretKeyDown(caret, key('u', {ctrl: true}), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(editable.getGraphemes().join('')).toBe('abc\nf');
  });

  it('Ctrl+K deletes to end of current line', () => {
    const editable = createEditable(g('abc\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(4); // start of 'def'

    const handled = handleCaretKeyDown(caret, key('k', {ctrl: true}), {config: multiLineConfig});

    expect(handled).toBe(true);
    expect(editable.getGraphemes().join('')).toBe('abc\n');
  });

  it('inserts newline on Shift+Enter', () => {
    const editable = createEditable(g('ab'));
    const caret = new Caret(editable);

    caret.moveTo(1);

    const handled = handleCaretKeyDown(caret, key('Enter', {shift: true}), {
      config: multiLineConfig,
    });

    expect(handled).toBe(true);
    expect(editable.getGraphemes().join('')).toBe('a\nb');
  });

  it('moves to previous paragraph with Option+ArrowUp', () => {
    const editable = createEditable(g('abc\n\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(7); // end of 'def'

    const handled = handleCaretKeyDown(caret, key('ArrowUp', {alt: true}), {
      config: multiLineConfig,
    });

    expect(handled).toBe(true);
    expect(caret.position).toBe(5); // start of 'def'
  });

  it('moves to next paragraph with Option+ArrowDown', () => {
    const editable = createEditable(g('abc\n\ndef'));
    const caret = new Caret(editable);

    caret.moveTo(0);

    const handled = handleCaretKeyDown(caret, key('ArrowDown', {alt: true}), {
      config: multiLineConfig,
    });

    expect(handled).toBe(true);
    expect(caret.position).toBe(5); // start of 'def' (past blank line)
  });
});
