import {describe, expect, it} from 'vitest';
import {Window} from '../../../dom/classes/Window';
import {CaretManager} from '../CaretManager';

import type {Element} from '../../../dom/classes/Element';
import type {LayoutBox} from '../../../layout/types';
import type {Editable} from '../../types/Editable';

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
    updateScroll: () => {},
    isReadonly: () => false,
    isDisabled: () => false,
    getElement: () => element,
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
});
