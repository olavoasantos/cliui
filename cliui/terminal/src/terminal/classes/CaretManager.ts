import {graphemeWidth} from '../../layout/utilities/graphemeWidth';
import {cachedComputeVisualLines} from '../utilities/cachedComputeVisualLines';
import {findLineForCursor} from '../utilities/findLineForCursor';
import {EDITABLE} from '../constants/editable';
import {Caret} from './Caret';

import type {Element} from '@cliui/dom';
import type {LayoutBox} from '../../layout/types';
import type {CaretOverlay} from '../types/CaretOverlay';
import type {EditableConfiguration} from '../types/EditableConfiguration';
import type {Editable} from '../types/Editable';
import type {VisualLine} from '../types/VisualLine';

/**
 * Manages all active carets in the terminal.
 *
 * Typically one caret exists per focused editable element.  The manager
 * ticks blink timers, creates/removes carets on focus transitions, and
 * resolves screen-space overlays for the renderer.
 *
 * Supports both single-line and multi-line editables. When an element
 * carries an `[EDITABLE]` configuration, cursor and selection overlays
 * are computed using 2D visual line mapping.
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

      const config = this.getConfig(caret.target.getElement());
      const overlay = config
        ? this.resolveOverlay2D(caret, box, config)
        : this.resolveOverlay1D(caret, box);

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
   * Reads the `[EDITABLE]` configuration from a DOM element, if present.
   */
  private getConfig(element: Element): EditableConfiguration | null {
    const el = element as unknown as Partial<Record<typeof EDITABLE, EditableConfiguration>>;
    return el[EDITABLE] ?? null;
  }

  /**
   * Legacy single-line overlay computation (no config).
   */
  private resolveOverlay1D(caret: Caret, box: LayoutBox): CaretOverlay | null {
    const graphemes = caret.target.getGraphemes();
    const scrollOffset = caret.target.getScrollOffset();
    const cursorPos = caret.position;

    let xOffset = 0;

    for (let i = scrollOffset; i < cursorPos && i < graphemes.length; i++) {
      xOffset += graphemeWidth(graphemes[i]!);
    }

    const cursorX = box.contentX + xOffset;
    const cursorY = box.contentY;

    if (cursorX >= box.contentX + box.contentWidth) {
      return null;
    }

    const selection = this.resolveSelectionRanges1D(caret, box, graphemes, scrollOffset);

    return {
      cursorX,
      cursorY,
      cursorVisible: caret.cursorVisible,
      selection,
    };
  }

  /**
   * Legacy single-line selection range computation.
   */
  private resolveSelectionRanges1D(
    caret: Caret,
    box: LayoutBox,
    graphemes: string[],
    scrollOffset: number,
  ): Array<{x: number; y: number; width: number}> {
    const range = caret.getSelectedRange();
    if (!range) return [];

    const [start, end] = range;
    const visibleStart = Math.max(start, scrollOffset);
    const visibleEnd = Math.min(end, graphemes.length);

    if (visibleEnd <= visibleStart) return [];

    let x = box.contentX;

    for (let i = scrollOffset; i < visibleStart; i++) {
      x += graphemeWidth(graphemes[i]!);
    }

    let width = 0;
    for (let i = visibleStart; i < visibleEnd; i++) {
      const w = graphemeWidth(graphemes[i]!);

      if (x + width + w > box.contentX + box.contentWidth) {
        break;
      }

      width += w;
    }

    return width > 0 ? [{x, y: box.contentY, width}] : [];
  }

  /**
   * 2D overlay computation using visual lines.
   */
  private resolveOverlay2D(
    caret: Caret,
    box: LayoutBox,
    config: EditableConfiguration,
  ): CaretOverlay | null {
    const graphemes = caret.target.getGraphemes();
    const scrollX = caret.target.getScrollOffset();
    const scrollY = caret.target.getScrollY();
    const lines = cachedComputeVisualLines(
      caret.target.getVisualLineCache(),
      graphemes,
      box.contentWidth,
      config.wordWrap,
    );
    const cursorPos = caret.position;

    const {lineIndex, columnCells} = this.findCursorLine(graphemes, lines, cursorPos, scrollX);

    const screenRow = lineIndex - scrollY;

    if (screenRow < 0 || screenRow >= box.contentHeight) {
      return {
        cursorX: box.contentX,
        cursorY: box.contentY,
        cursorVisible: false,
        selection: this.resolveSelectionRanges2D(caret, box, graphemes, lines, scrollY),
      };
    }

    const cursorX = box.contentX + columnCells;
    const cursorY = box.contentY + screenRow;

    if (cursorX >= box.contentX + box.contentWidth) {
      return null;
    }

    const selection = this.resolveSelectionRanges2D(caret, box, graphemes, lines, scrollY);

    return {
      cursorX,
      cursorY,
      cursorVisible: caret.cursorVisible,
      selection,
    };
  }

  /**
   * Finds the visual line and column cell offset for a cursor position.
   */
  private findCursorLine(
    graphemes: string[],
    lines: VisualLine[],
    cursorPos: number,
    scrollX: number,
  ): {lineIndex: number; columnCells: number} {
    const lineIndex = findLineForCursor(lines, cursorPos, graphemes);
    const line = lines[lineIndex]!;
    let columnCells = 0;
    const start = Math.max(line.start, line.start + scrollX);

    for (let j = start; j < cursorPos && j < graphemes.length; j++) {
      if (graphemes[j] === '\n') continue;
      columnCells += graphemeWidth(graphemes[j]!);
    }

    return {lineIndex, columnCells};
  }

  /**
   * 2D selection range computation across visual lines.
   */
  private resolveSelectionRanges2D(
    caret: Caret,
    box: LayoutBox,
    graphemes: string[],
    lines: VisualLine[],
    scrollY: number,
  ): Array<{x: number; y: number; width: number}> {
    const range = caret.getSelectedRange();
    if (!range) return [];

    const [selStart, selEnd] = range;
    const ranges: Array<{x: number; y: number; width: number}> = [];

    for (let i = 0; i < lines.length; i++) {
      const screenRow = i - scrollY;

      if (screenRow < 0 || screenRow >= box.contentHeight) continue;

      const line = lines[i]!;
      const lineSelStart = Math.max(selStart, line.start);
      const lineSelEnd = Math.min(selEnd, line.end);

      if (lineSelStart >= lineSelEnd) continue;

      let x = box.contentX;

      for (let j = line.start; j < lineSelStart; j++) {
        if (graphemes[j] === '\n') continue;
        x += graphemeWidth(graphemes[j]!);
      }

      let width = 0;

      for (let j = lineSelStart; j < lineSelEnd; j++) {
        if (graphemes[j] === '\n') continue;
        const w = graphemeWidth(graphemes[j]!);

        if (x + width + w > box.contentX + box.contentWidth) break;

        width += w;
      }

      if (width > 0) {
        ranges.push({x, y: box.contentY + screenRow, width});
      }
    }

    return ranges;
  }
}
