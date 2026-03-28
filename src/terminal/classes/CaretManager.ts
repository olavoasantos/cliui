import {cellWidth} from '../../layout/utilities/cellWidth';
import {Caret} from './Caret';

import type {Element} from '../../dom/classes/Element';
import type {LayoutBox} from '../../layout/types';
import type {CaretOverlay} from '../types/CaretOverlay';
import type {Editable} from '../types/Editable';

/**
 * Manages all active carets in the terminal.
 *
 * Typically one caret exists per focused editable element.  The manager
 * ticks blink timers, creates/removes carets on focus transitions, and
 * resolves screen-space overlays for the renderer.
 */
export class CaretManager {
  private readonly carets = new Set<Caret>();

  /** Creates a caret bound to the given editable and returns it. */
  createCaret(target: Editable): Caret {
    const caret = new Caret(target);
    this.carets.add(caret);
    return caret;
  }

  /** Removes a caret from the manager. */
  removeCaret(caret: Caret): void {
    this.carets.delete(caret);
  }

  /** Returns all active carets. */
  getCarets(): ReadonlySet<Caret> {
    return this.carets;
  }

  /**
   * Advances blink timers for all carets.
   *
   * @returns `true` if any caret's blink phase changed.
   */
  tick(timestamp: number): boolean {
    let changed = false;

    for (const caret of this.carets) {
      if (caret.tick(timestamp)) {
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Resolves screen-space overlays for all active carets by mapping
   * each caret's editable element to its layout box in the tree.
   */
  getOverlays(layoutRoot: LayoutBox | null): CaretOverlay[] {
    if (!layoutRoot) return [];

    const overlays: CaretOverlay[] = [];

    for (const caret of this.carets) {
      const box = this.findLayoutBox(layoutRoot, caret.target.getElement());
      if (!box) continue;

      const overlay = this.resolveOverlay(caret, box);
      if (overlay) overlays.push(overlay);
    }

    return overlays;
  }

  /**
   * Finds the layout box for a given DOM element by walking the tree.
   */
  private findLayoutBox(box: LayoutBox, element: Element): LayoutBox | null {
    if (box.element === element) return box;

    for (const child of box.children) {
      const found = this.findLayoutBox(child, element);
      if (found) return found;
    }

    return null;
  }

  /**
   * Computes the screen-space cursor position for a caret within its
   * layout box's content area.
   */
  private resolveOverlay(caret: Caret, box: LayoutBox): CaretOverlay | null {
    const graphemes = caret.target.getGraphemes();
    const scrollOffset = caret.target.getScrollOffset();
    const cursorPos = caret.position;

    /* Walk graphemes from the scroll offset to the cursor to find the x offset */
    let xOffset = 0;

    for (let i = scrollOffset; i < cursorPos && i < graphemes.length; i++) {
      xOffset += cellWidth(graphemes[i]!);
    }

    const cursorX = box.contentX + xOffset;
    const cursorY = box.contentY;

    /* Cursor is clipped if it falls outside the content area */
    if (cursorX >= box.contentX + box.contentWidth) {
      return null;
    }

    return {
      cursorX,
      cursorY,
      cursorVisible: caret.cursorVisible,
      selection: [],
    };
  }
}
