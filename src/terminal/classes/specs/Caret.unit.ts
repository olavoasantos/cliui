import {describe, expect, it} from 'vitest';
import {Caret} from '../Caret';

import type {Editable} from '../../types/Editable';
import {createVisualLineCache} from '../../utilities/cachedComputeVisualLines';

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

describe('Caret', () => {
  describe('cursor movement', () => {
    it('moves to a valid position', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(2);

      expect(caret.position).toBe(2);
    });

    it('clamps to bounds', () => {
      const editable = createEditable(['a', 'b']);
      const caret = new Caret(editable);

      caret.moveTo(10);
      expect(caret.position).toBe(2);

      caret.moveTo(-5);
      expect(caret.position).toBe(0);
    });

    it('clears selection on moveTo', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.selectTo(2);
      expect(caret.hasSelection()).toBe(true);

      caret.moveTo(1);
      expect(caret.hasSelection()).toBe(false);
    });
  });

  describe('blink', () => {
    it('starts visible', () => {
      const editable = createEditable();
      const caret = new Caret(editable);

      expect(caret.cursorVisible).toBe(true);
    });

    it('toggles after the blink interval', () => {
      const editable = createEditable();
      const caret = new Caret(editable, 100);

      caret.tick(0);
      expect(caret.cursorVisible).toBe(true);

      caret.tick(50);
      expect(caret.cursorVisible).toBe(true);

      caret.tick(100);
      expect(caret.cursorVisible).toBe(false);

      caret.tick(200);
      expect(caret.cursorVisible).toBe(true);
    });

    it('resets on moveTo', () => {
      const editable = createEditable(['a']);
      const caret = new Caret(editable, 100);

      caret.tick(0);
      caret.tick(100);
      expect(caret.cursorVisible).toBe(false);

      caret.moveTo(1);
      expect(caret.cursorVisible).toBe(true);
    });
  });

  describe('selection', () => {
    it('has no selection initially', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      expect(caret.hasSelection()).toBe(false);
      expect(caret.getSelectedRange()).toBeNull();
    });

    it('creates a selection with selectTo', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(0);
      caret.selectTo(2);

      expect(caret.hasSelection()).toBe(true);
      expect(caret.getSelectedRange()).toEqual([0, 2]);
    });

    it('returns sorted range regardless of direction', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(3);
      caret.selectTo(1);

      expect(caret.getSelectedRange()).toEqual([1, 3]);
    });

    it('clears selection with clearSelection', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.selectTo(2);
      caret.clearSelection();

      expect(caret.hasSelection()).toBe(false);
    });
  });

  describe('editing', () => {
    it('inserts text at cursor position', () => {
      const editable = createEditable(['a', 'b']);
      const caret = new Caret(editable);

      caret.moveTo(1);
      caret.insertText('x');

      expect(editable.getGraphemes()).toEqual(['a', 'x', 'b']);
      expect(caret.position).toBe(2);
    });

    it('replaces selection when inserting', () => {
      const editable = createEditable(['a', 'b', 'c', 'd']);
      const caret = new Caret(editable);

      caret.moveTo(1);
      caret.selectTo(3);
      caret.insertText('x');

      expect(editable.getGraphemes()).toEqual(['a', 'x', 'd']);
      expect(caret.hasSelection()).toBe(false);
    });

    it('deletes the selected range', () => {
      const editable = createEditable(['a', 'b', 'c', 'd']);
      const caret = new Caret(editable);

      caret.moveTo(1);
      caret.selectTo(3);

      expect(caret.deleteSelection()).toBe(true);
      expect(editable.getGraphemes()).toEqual(['a', 'd']);
      expect(caret.position).toBe(1);
      expect(caret.hasSelection()).toBe(false);
    });

    it('returns false when deleting with no selection', () => {
      const editable = createEditable(['a']);
      const caret = new Caret(editable);

      expect(caret.deleteSelection()).toBe(false);
    });
  });

  describe('getSelectedText', () => {
    it('returns empty string when there is no selection', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      expect(caret.getSelectedText()).toBe('');
    });

    it('returns the selected graphemes joined as a string', () => {
      const editable = createEditable(['h', 'e', 'l', 'l', 'o']);
      const caret = new Caret(editable);

      caret.moveTo(1);
      caret.selectTo(4);

      expect(caret.getSelectedText()).toBe('ell');
    });

    it('returns the full text when everything is selected', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(0);
      caret.selectTo(3);

      expect(caret.getSelectedText()).toBe('abc');
    });

    it('works when selection direction is reversed', () => {
      const editable = createEditable(['a', 'b', 'c', 'd']);
      const caret = new Caret(editable);

      caret.moveTo(3);
      caret.selectTo(1);

      expect(caret.getSelectedText()).toBe('bc');
    });
  });

  describe('tick after position change', () => {
    it('reports change on the first tick after selectTo', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(0);
      // Consume the initial ticks
      caret.tick(0);
      caret.tick(100);

      // selectTo triggers resetBlink
      caret.selectTo(2);

      // The very next tick should report a change
      expect(caret.tick(200)).toBe(true);
    });

    it('reports change on the first tick after moveTo', () => {
      const editable = createEditable(['a', 'b', 'c']);
      const caret = new Caret(editable);

      caret.moveTo(0);
      caret.tick(0);
      caret.tick(100);

      caret.moveTo(2);

      expect(caret.tick(200)).toBe(true);
    });
  });
});
