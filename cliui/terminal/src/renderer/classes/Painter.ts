import {GRAPHEME_SEGMENTER, PRINTABLE_ASCII_REGEX} from '../../layout/constants/cellWidth';
import {graphemeWidth} from '../../layout/utilities/graphemeWidth';
import {createLinearGradient} from '../utilities/createLinearGradient';
import {parseColor} from '../utilities/parseColor';
import {parseGradientStops} from '../utilities/parseGradientStops';
import type {Cell, UnderlineStyle} from '../types';
import {BorderStyleRegistry} from './BorderStyleRegistry';
import {CellBuffer} from './CellBuffer';

import type {LayoutBox} from '../../layout/types';
import type {ComputedStyle} from '../../css/types';
import type {BoxMetrics} from '../types';
import type {ClipRect} from '../types';

type CachedTextLine = {
  width: number;
  ascii: boolean;
  segments: readonly string[] | null;
  segmentWidths: readonly number[] | null;
};

const EMPTY_TEXT_LINE: Readonly<CachedTextLine> = Object.freeze({
  width: 0,
  ascii: true,
  segments: null,
  segmentWidths: null,
});
const MAX_TEXT_LINE_CACHE_SIZE = 2048;

/**
 * Paints layout boxes into a renderer cell buffer.
 *
 * Supports text alignment, vertical alignment, and nested `overflow: hidden`
 * clipping in addition to the Phase 1 background, border, and text painting.
 */
export class Painter {
  /** Border style registry for resolving `border-style` values. */
  readonly borderStyles = new BorderStyleRegistry();

  private readonly styledCellCache = new WeakMap<ComputedStyle, Cell>();
  private readonly textLineCache = new Map<string, CachedTextLine>();
  /**
   * Paints one or more layout boxes into the provided cell buffer.
   *
   * @param boxes - Layout boxes to paint in order.
   * @param buffer - The destination cell buffer.
   */
  paint(boxes: LayoutBox | LayoutBox[], buffer: CellBuffer): void {
    const list = Array.isArray(boxes) ? boxes : [boxes];
    const flattened = this.flattenBoxes(list);

    flattened.sort((left, right) => {
      if (left.stackingZ !== right.stackingZ) {
        return left.stackingZ - right.stackingZ;
      }

      return left.order - right.order;
    });

    for (const entry of flattened) {
      this.paintBox(entry.box, buffer, entry.clipRect);
    }
  }

  private paintBox(box: LayoutBox, buffer: CellBuffer, clipRect: ClipRect | null): void {
    const metrics = this.getMetrics(box);
    const textCell = this.createStyledCell(box);
    const contentClipRect = this.createChildClipRect(box, clipRect);

    this.paintBackground(metrics, textCell, buffer, clipRect, box.computedStyle);
    this.paintBorder(metrics, box.computedStyle, textCell, buffer, clipRect);

    // <hr> elements fill their content row with horizontal line characters
    if (box.element.localName === 'hr') {
      this.paintHorizontalRule(box, textCell, buffer, clipRect);
    } else {
      this.paintText(box, textCell, buffer, contentClipRect);
    }
  }

  private flattenBoxes(
    boxes: LayoutBox[],
  ): Array<{box: LayoutBox; clipRect: ClipRect | null; order: number; stackingZ: number}> {
    const flattened: Array<{
      box: LayoutBox;
      clipRect: ClipRect | null;
      order: number;
      stackingZ: number;
    }> = [];
    let order = 0;

    const visit = (box: LayoutBox, clipRect: ClipRect | null, parentStackingZ: number): void => {
      // Absolute-positioned elements escape their parent's overflow clip
      const effectiveClip = box.computedStyle.get('position') === 'absolute' ? null : clipRect;

      // Children inherit their parent's stacking z-index so they sort
      // together and paint in document order within the same stacking context.
      const stackingZ = box.zIndex !== 0 ? box.zIndex : parentStackingZ;

      flattened.push({box, clipRect: effectiveClip, order, stackingZ});
      order += 1;

      const childClipRect = this.createChildClipRect(box, effectiveClip);

      for (const child of box.children) {
        visit(child, childClipRect, stackingZ);
      }
    };

    for (const box of boxes) {
      visit(box, null, 0);
    }

    return flattened;
  }

  private paintBackground(
    metrics: BoxMetrics,
    textCell: Cell,
    buffer: CellBuffer,
    clipRect: ClipRect | null,
    computedStyle: ComputedStyle,
  ): void {
    const bgValue = computedStyle.get('background-color');
    const gradient = bgValue ? parseGradientStops(bgValue) : null;
    const sampler = gradient
      ? createLinearGradient(
          gradient.angleDeg,
          gradient.stops,
          metrics.outerWidth,
          metrics.outerHeight,
        )
      : null;

    if (textCell.bg === null && sampler === null) {
      return;
    }

    const bgCell: Cell = {
      char: ' ',
      fg: textCell.fg,
      bg: textCell.bg,
      bold: textCell.bold,
      italic: textCell.italic,
      underline: textCell.underline,
      underlineColor: textCell.underlineColor,
      strikethrough: textCell.strikethrough,
      faint: textCell.faint,
      hyperlink: textCell.hyperlink,
    };

    for (let y = metrics.outerY; y < metrics.outerY + metrics.outerHeight; y += 1) {
      for (let x = metrics.outerX; x < metrics.outerX + metrics.outerWidth; x += 1) {
        if (buffer.getRef(x, y) === undefined || !this.isWithinClipRect(x, y, clipRect)) {
          continue;
        }

        if (sampler) {
          bgCell.bg = sampler(x - metrics.outerX, y - metrics.outerY);
        }

        buffer.setDirect(x, y, bgCell);
      }
    }
  }

  private paintBorder(
    metrics: BoxMetrics,
    computedStyle: ComputedStyle,
    textCell: Cell,
    buffer: CellBuffer,
    clipRect: ClipRect | null,
  ): void {
    if (!metrics.hasBorder || metrics.outerWidth <= 0 || metrics.outerHeight <= 0) {
      return;
    }

    const borderStyle = computedStyle.get('border-style') ?? 'single';
    const characters = this.borderStyles.get(borderStyle);
    const borderColorValue = computedStyle.get('border-color');
    const gradient = borderColorValue ? parseGradientStops(borderColorValue) : null;
    const sampler = gradient
      ? createLinearGradient(
          gradient.angleDeg,
          gradient.stops,
          metrics.outerWidth,
          metrics.outerHeight,
        )
      : null;
    const solidColor = gradient ? null : parseColor(borderColorValue);
    const borderCell: Cell = {
      char: ' ',
      fg: solidColor,
      bg: textCell.bg,
      bold: textCell.bold,
      italic: textCell.italic,
      underline: textCell.underline,
      underlineColor: textCell.underlineColor,
      strikethrough: textCell.strikethrough,
      faint: textCell.faint,
      hyperlink: textCell.hyperlink,
    };
    const maxX = metrics.outerX + metrics.outerWidth - 1;
    const maxY = metrics.outerY + metrics.outerHeight - 1;

    /* Corners */
    borderCell.char = characters.topLeft;
    borderCell.fg = sampler ? sampler(0, 0) : solidColor;
    this.writeCell(buffer, metrics.outerX, metrics.outerY, borderCell, clipRect);

    borderCell.char = characters.topRight;
    borderCell.fg = sampler ? sampler(metrics.outerWidth - 1, 0) : solidColor;
    this.writeCell(buffer, maxX, metrics.outerY, borderCell, clipRect);

    borderCell.char = characters.bottomLeft;
    borderCell.fg = sampler ? sampler(0, metrics.outerHeight - 1) : solidColor;
    this.writeCell(buffer, metrics.outerX, maxY, borderCell, clipRect);

    borderCell.char = characters.bottomRight;
    borderCell.fg = sampler ? sampler(metrics.outerWidth - 1, metrics.outerHeight - 1) : solidColor;
    this.writeCell(buffer, maxX, maxY, borderCell, clipRect);

    /* Top and bottom edges */
    for (let x = metrics.outerX + 1; x < maxX; x += 1) {
      const lx = x - metrics.outerX;

      borderCell.char = characters.top;
      borderCell.fg = sampler ? sampler(lx, 0) : solidColor;
      this.writeCell(buffer, x, metrics.outerY, borderCell, clipRect);

      borderCell.char = characters.bottom;
      borderCell.fg = sampler ? sampler(lx, metrics.outerHeight - 1) : solidColor;
      this.writeCell(buffer, x, maxY, borderCell, clipRect);
    }

    /* Left and right edges */
    for (let y = metrics.outerY + 1; y < maxY; y += 1) {
      const ly = y - metrics.outerY;

      borderCell.char = characters.left;
      borderCell.fg = sampler ? sampler(0, ly) : solidColor;
      this.writeCell(buffer, metrics.outerX, y, borderCell, clipRect);

      borderCell.char = characters.right;
      borderCell.fg = sampler ? sampler(metrics.outerWidth - 1, ly) : solidColor;
      this.writeCell(buffer, maxX, y, borderCell, clipRect);
    }
  }

  /**
   * Paints a horizontal rule (`<hr>`) by filling the content row with
   * horizontal line characters (`─`).
   */
  /**
   * Reserves a cell region for an `<img>` element and enqueues a
   * graphics protocol render request.
   *
   * The content area is filled with spaces to prevent text from
   * bleeding through. The actual image is rendered out-of-band
   * via the graphics protocol selected by the Renderer.
   */
  private paintHorizontalRule(
    box: LayoutBox,
    textCell: Cell,
    buffer: CellBuffer,
    clipRect: ClipRect | null,
  ): void {
    const y = box.contentY;

    if (y >= box.contentY + box.contentHeight) return;

    const hrCell: Cell = {
      char: '─',
      fg: textCell.fg,
      bg: textCell.bg,
      bold: textCell.bold,
      italic: textCell.italic,
      underline: textCell.underline,
      underlineColor: textCell.underlineColor,
      strikethrough: textCell.strikethrough,
      faint: textCell.faint,
      hyperlink: textCell.hyperlink,
    };

    for (let x = box.contentX; x < box.contentX + box.contentWidth; x++) {
      this.writeCell(buffer, x, y, hrCell, clipRect);
    }
  }

  private paintText(
    box: LayoutBox,
    textCell: Cell,
    buffer: CellBuffer,
    clipRect: ClipRect | null,
  ): void {
    if (box.textLines === undefined || box.textLines.length === 0) {
      return;
    }

    const startY = this.resolveTextStartY(box);
    const writeCell: Cell = {
      char: ' ',
      fg: textCell.fg,
      bg: textCell.bg,
      bold: textCell.bold,
      italic: textCell.italic,
      underline: textCell.underline,
      underlineColor: textCell.underlineColor,
      strikethrough: textCell.strikethrough,
      faint: textCell.faint,
      hyperlink: textCell.hyperlink,
    };
    const maxX = box.contentX + box.contentWidth;

    for (let row = 0; row < box.textLines.length; row += 1) {
      const y = startY + row;

      if (y >= box.contentY + box.contentHeight) {
        break;
      }

      const line = box.textLines[row]!;
      const cachedLine = this.getCachedTextLine(line);
      let x = this.resolveTextStartX(box, cachedLine.width);

      if (x >= maxX) {
        continue;
      }

      if (cachedLine.ascii) {
        const limit = Math.min(line.length, maxX - x);

        for (let index = 0; index < limit; index += 1) {
          writeCell.char = line[index]!;
          this.writeCell(buffer, x + index, y, writeCell, clipRect);
        }

        continue;
      }

      const segments = cachedLine.segments;
      const segmentWidths = cachedLine.segmentWidths;

      if (segments === null || segmentWidths === null) {
        continue;
      }

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index]!;
        const width = segmentWidths[index]!;

        if (x >= maxX) {
          break;
        }

        writeCell.char = segment;
        this.writeCell(buffer, x, y, writeCell, clipRect);

        for (let offset = 1; offset < width; offset += 1) {
          if (x + offset >= maxX) {
            break;
          }

          writeCell.char = ' ';
          this.writeCell(buffer, x + offset, y, writeCell, clipRect);
        }

        x += width;
      }
    }
  }

  private createStyledCell(box: LayoutBox): Cell {
    let cell = this.styledCellCache.get(box.computedStyle);

    if (cell === undefined) {
      const decoration = box.computedStyle.get('text-decoration') ?? '';
      const underline = decoration.includes('underline')
        ? this.parseUnderlineStyle(box.computedStyle.get('text-decoration-style'))
        : 'none';
      const opacity = Number.parseFloat(box.computedStyle.get('opacity') ?? '1');

      cell = {
        char: ' ',
        fg: parseColor(box.computedStyle.get('color')),
        bg: parseColor(box.computedStyle.get('background-color')),
        bold: box.computedStyle.get('font-weight') === 'bold',
        italic: box.computedStyle.get('font-style') === 'italic',
        underline,
        underlineColor: parseColor(box.computedStyle.get('text-decoration-color')),
        strikethrough: decoration.includes('line-through'),
        faint: Number.isFinite(opacity) && opacity < 0.5,
        hyperlink: box.computedStyle.get('hyperlink') ?? null,
      };

      this.styledCellCache.set(box.computedStyle, cell);
    }

    if (box.element.localName !== 'a') {
      return cell;
    }

    const href = box.element.getAttribute('href');

    if (href === null || cell.hyperlink === href) {
      return cell;
    }

    return {
      ...cell,
      hyperlink: href,
    };
  }

  private getCachedTextLine(line: string): CachedTextLine {
    if (line.length === 0) {
      return EMPTY_TEXT_LINE;
    }

    const cached = this.textLineCache.get(line);

    if (cached !== undefined) {
      return cached;
    }

    let next: CachedTextLine;

    if (PRINTABLE_ASCII_REGEX.test(line)) {
      next = {
        width: line.length,
        ascii: true,
        segments: null,
        segmentWidths: null,
      };
    } else {
      const segments: string[] = [];
      const segmentWidths: number[] = [];
      let width = 0;

      for (const {segment} of GRAPHEME_SEGMENTER.segment(line)) {
        const segmentWidth = Math.max(0, graphemeWidth(segment));

        if (segmentWidth === 0) {
          continue;
        }

        segments.push(segment);
        segmentWidths.push(segmentWidth);
        width += segmentWidth;
      }

      next = {
        width,
        ascii: false,
        segments,
        segmentWidths,
      };
    }

    if (this.textLineCache.size >= MAX_TEXT_LINE_CACHE_SIZE) {
      const oldestKey = this.textLineCache.keys().next().value;

      if (oldestKey !== undefined) {
        this.textLineCache.delete(oldestKey);
      }
    }

    this.textLineCache.set(line, next);

    return next;
  }

  private parseUnderlineStyle(value: string | undefined): UnderlineStyle {
    switch (value) {
      case 'double':
      case 'dotted':
      case 'dashed':
      case 'wavy':
        return value;
      default:
        return 'solid';
    }
  }

  private writeCell(
    buffer: CellBuffer,
    x: number,
    y: number,
    cell: Cell,
    clipRect: ClipRect | null,
  ): void {
    const existing = buffer.getRef(x, y);

    if (existing === undefined || !this.isWithinClipRect(x, y, clipRect)) {
      return;
    }

    if (cell.bg === null && existing.bg !== null) {
      this.writeCellWithBg = existing.bg;
      buffer.setDirect(x, y, cell);

      // Restore the bg that setDirect just overwrote with null
      const ref = buffer.getRef(x, y)!;
      ref.bg = {r: this.writeCellWithBg.r, g: this.writeCellWithBg.g, b: this.writeCellWithBg.b};
      return;
    }

    buffer.setDirect(x, y, cell);
  }

  /** Temporary storage for bg preservation in writeCell. */
  private writeCellWithBg: {r: number; g: number; b: number} | null = null;

  private resolveTextStartX(box: LayoutBox, lineWidth: number): number {
    const textAlign = box.computedStyle.get('text-align') ?? 'left';
    const freeSpace = Math.max(0, box.contentWidth - lineWidth);

    switch (textAlign) {
      case 'center':
        return box.contentX + Math.floor(freeSpace / 2);
      case 'right':
        return box.contentX + freeSpace;
      case 'left':
      default:
        return box.contentX;
    }
  }

  private resolveTextStartY(box: LayoutBox): number {
    const verticalAlign = box.computedStyle.get('vertical-align') ?? 'top';
    const textHeight = box.textLines?.length ?? 0;
    const freeSpace = Math.max(0, box.contentHeight - textHeight);
    const scrollOffsetY = box.scrollOffsetY ?? 0;

    switch (verticalAlign) {
      case 'middle':
        return box.contentY + Math.floor(freeSpace / 2) - scrollOffsetY;
      case 'bottom':
        return box.contentY + freeSpace - scrollOffsetY;
      case 'top':
      default:
        return box.contentY - scrollOffsetY;
    }
  }

  private createChildClipRect(box: LayoutBox, clipRect: ClipRect | null): ClipRect | null {
    const overflow = box.computedStyle.get('overflow');

    if (overflow !== 'hidden' && overflow !== 'scroll') {
      return clipRect;
    }

    return this.intersectClipRects(clipRect, {
      x: box.contentX,
      y: box.contentY,
      width: box.contentWidth,
      height: box.contentHeight,
    });
  }

  private intersectClipRects(a: ClipRect | null, b: ClipRect): ClipRect {
    if (a === null) {
      return b;
    }

    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const maxX = Math.min(a.x + a.width, b.x + b.width);
    const maxY = Math.min(a.y + a.height, b.y + b.height);

    return {
      x,
      y,
      width: Math.max(0, maxX - x),
      height: Math.max(0, maxY - y),
    };
  }

  private isWithinClipRect(x: number, y: number, clipRect: ClipRect | null): boolean {
    if (clipRect === null) {
      return true;
    }

    return (
      x >= clipRect.x &&
      y >= clipRect.y &&
      x < clipRect.x + clipRect.width &&
      y < clipRect.y + clipRect.height
    );
  }

  private getMetrics(box: LayoutBox): BoxMetrics {
    const marginTop = this.parseBoxValue(box.computedStyle.get('margin-top'));
    const marginRight = this.parseBoxValue(box.computedStyle.get('margin-right'));
    const marginBottom = this.parseBoxValue(box.computedStyle.get('margin-bottom'));
    const marginLeft = this.parseBoxValue(box.computedStyle.get('margin-left'));
    const outerX = box.x + marginLeft;
    const outerY = box.y + marginTop;
    const outerWidth = Math.max(0, box.width - marginLeft - marginRight);
    const outerHeight = Math.max(0, box.height - marginTop - marginBottom);
    const borderStyle = box.computedStyle.get('border-style');
    const hasBorder =
      borderStyle !== undefined &&
      borderStyle !== '' &&
      borderStyle !== 'none' &&
      outerWidth > 0 &&
      outerHeight > 0;

    return {
      outerX,
      outerY,
      outerWidth,
      outerHeight,
      hasBorder,
    };
  }

  private parseBoxValue(value: string | undefined): number {
    if (value === undefined || value === '' || value === 'auto') {
      return 0;
    }

    const parsed = Number.parseInt(value, 10);

    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
}
