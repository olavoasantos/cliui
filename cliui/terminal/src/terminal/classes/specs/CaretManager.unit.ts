import {describe, expect, it} from 'vitest';
import {Window} from '@cliui/dom';
import {EDITABLE} from '../../constants/editable';
import {CaretManager} from '../CaretManager';

import type {Element} from '@cliui/dom';
import type {LayoutBox} from '../../../layout/types';
import type {EditableConfiguration} from '../../types/EditableConfiguration';
import type {Editable} from '../../types/Editable';
import {createVisualLineCache} from '../../utilities/cachedComputeVisualLines';

function createEditable(
  element: Element,
  graphemes: string[] = [],
): Editable & {cursorPos: number} {
  const state = {graphemes: [...graphemes], cursorPos: 0};

  return {
    ...state,
    getGraphemes: () => state.graphemes,
    getCursorPosition: () => state.cursorPos,
    setCursorPosition: (pos: number) => {
      state.cursorPos = pos;
    },
    insertText: (text: string) => {
      state.graphemes.splice(state.cursorPos, 0, ...text);
      state.cursorPos += text.length;
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
    getElement: () => element,
    getVisualLineCache: () => createVisualLineCache(),
  };
}

function makeBox(element: Element, contentX = 5, contentY = 3, contentWidth = 20): LayoutBox {
  return {
    element,
    x: contentX - 1,
    y: contentY - 1,
    width: contentWidth + 2,
    height: 3,
    contentX,
    contentY,
    contentWidth,
    contentHeight: 1,
    computedStyle: new Map(),
    children: [],
    zIndex: 0,
  };
}

describe('CaretManager', () => {
  it('creates and removes carets', () => {
    const manager = new CaretManager();
    const element = new Window().document.createElement('div');
    const editable = createEditable(element);

    const caret = manager.createCaret(editable);
    expect(manager.getCarets().size).toBe(1);

    manager.removeCaret(caret);
    expect(manager.getCarets().size).toBe(0);
  });

  it('ticks all carets and reports blink changes', () => {
    const manager = new CaretManager();
    const element = new Window().document.createElement('div');
    const editable = createEditable(element);

    manager.createCaret(editable);

    expect(manager.tick(0)).toBe(false); // initializes timestamp
    expect(manager.tick(100)).toBe(false); // not yet
    expect(manager.tick(530)).toBe(true); // blink toggles
  });

  it('resolves overlay screen coordinates from layout', () => {
    const manager = new CaretManager();
    const doc = new Window().document;
    const element = doc.createElement('div');
    const editable = createEditable(element, ['h', 'e', 'l', 'l', 'o']);

    const caret = manager.createCaret(editable);
    caret.moveTo(3);

    const box = makeBox(element, 5, 3, 20);
    const overlays = manager.getOverlays(box);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]!.cursorX).toBe(8); // 5 + 3 characters
    expect(overlays[0]!.cursorY).toBe(3);
    expect(overlays[0]!.cursorVisible).toBe(true);
  });

  it('returns empty overlays when no layout box matches', () => {
    const manager = new CaretManager();
    const doc = new Window().document;
    const element = doc.createElement('div');
    const otherElement = doc.createElement('span');
    const editable = createEditable(element);

    manager.createCaret(editable);

    const box = makeBox(otherElement);
    const overlays = manager.getOverlays(box);

    expect(overlays).toHaveLength(0);
  });

  it('returns empty overlays when layout root is null', () => {
    const manager = new CaretManager();
    const element = new Window().document.createElement('div');

    manager.createCaret(createEditable(element));

    expect(manager.getOverlays(null)).toEqual([]);
  });

  it('resolves selection ranges into overlay spans', () => {
    const manager = new CaretManager();
    const doc = new Window().document;
    const element = doc.createElement('div');
    const editable = createEditable(element, ['h', 'e', 'l', 'l', 'o']);

    const caret = manager.createCaret(editable);
    caret.moveTo(1);
    caret.selectTo(4); // selects 'ell'

    const box = makeBox(element, 5, 3, 20);
    const overlays = manager.getOverlays(box);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]!.selection).toEqual([{x: 6, y: 3, width: 3}]);
  });

  it('resolves 2D cursor position on the correct visual line', () => {
    const manager = new CaretManager();
    const doc = new Window().document;
    const element = doc.createElement('div');
    const editable = createEditable(element, ['a', 'b', '\n', 'd', 'e', 'f']);
    const config: EditableConfiguration = {
      intrinsicWidth: () => 20,
      intrinsicHeight: () => 5,
      wordWrap: false,
      multiLine: true,
    };

    (element as unknown as Record<symbol, EditableConfiguration>)[EDITABLE] = config;

    const caret = manager.createCaret(editable);
    caret.moveTo(4); // 'e' on line 1

    const box = makeBox(element, 5, 3, 20);
    box.contentHeight = 5;
    const overlays = manager.getOverlays(box);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]!.cursorX).toBe(6); // 'd'=1 cell offset
    expect(overlays[0]!.cursorY).toBe(4); // line 1 → row 3+1=4
  });

  it('resolves multi-line selection into per-row ranges', () => {
    const manager = new CaretManager();
    const doc = new Window().document;
    const element = doc.createElement('div');
    const editable = createEditable(element, ['a', 'b', '\n', 'd', 'e', 'f']);
    const config: EditableConfiguration = {
      intrinsicWidth: () => 20,
      intrinsicHeight: () => 5,
      wordWrap: false,
      multiLine: true,
    };

    (element as unknown as Record<symbol, EditableConfiguration>)[EDITABLE] = config;

    const caret = manager.createCaret(editable);
    caret.moveTo(0);
    caret.selectTo(5); // 'a','b','\n','d','e' across 2 lines

    const box = makeBox(element, 5, 3, 20);
    box.contentHeight = 5;
    const overlays = manager.getOverlays(box);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]!.selection).toEqual([
      {x: 5, y: 3, width: 2}, // 'ab' on line 0
      {x: 5, y: 4, width: 2}, // 'de' on line 1
    ]);
  });
});
