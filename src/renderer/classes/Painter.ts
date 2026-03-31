import {GRAPHEME_SEGMENTER} from '../../layout/constants/cellWidth';
import {cellWidth} from '../../layout/utilities/cellWidth';
import {graphemeWidth} from '../../layout/utilities/graphemeWidth';
import {createLinearGradient} from '../utilities/createLinearGradient';
import {parseColor} from '../utilities/parseColor';
import {parseGradientStops} from '../utilities/parseGradientStops';
import type {Cell, UnderlineStyle} from '../types';
import {BorderStyleRegistry} from './BorderStyleRegistry';
import {CellBuffer} from './CellBuffer';

import type {LayoutBox} from '../../layout/types';
import type {ComputedStyle} from '../../css/types';
import type {BoxMetrics} from '../types/BoxMetrics';
import type {ClipRect} from '../types/ClipRect';

/**
 * Paints layout boxes into a renderer cell buffer.
 *
 * Supports text alignment, vertical alignment, and nested `overflow: hidden`
 * clipping in addition to the Phase 1 background, border, and text painting.
 */
export class Painter {
  /** Border style registry for resolving `border-style` values. */
  readonly borderStyles = new BorderStyleRegistry();
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
    const textCell = this.createStyledCell(box.computedStyle);
    const contentClipRect = this.createChildClipRect(box, clipRect);

    // Anchor elements propagate href to the cell hyperlink field
    if (box.element.localName === 'a') {
      const href = box.element.getAttribute('href');

      if (href) {
        textCell.hyperlink = href;
      }
    }

    this.paintBackground(metrics, textCell, buffer, clipRect);
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
  ): void {
    if (textCell.bg === null) {
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

    for (let row = 0; row < box.textLines.length; row += 1) {
      const y = startY + row;

      if (y >= box.contentY + box.contentHeight) {
        break;
      }

      const line = box.textLines[row]!;
      let x = this.resolveTextStartX(box, line);

      for (const {segment} of GRAPHEME_SEGMENTER.segment(line)) {
        const width = Math.max(0, graphemeWidth(segment));

        if (width === 0) {
          continue;
        }

        if (x >= box.contentX + box.contentWidth) {
          break;
        }

        writeCell.char = segment;
        this.writeCell(buffer, x, y, writeCell, clipRect);

        for (let offset = 1; offset < width; offset += 1) {
          if (x + offset >= box.contentX + box.contentWidth) {
            break;
          }

          writeCell.char = ' ';
          this.writeCell(buffer, x + offset, y, writeCell, clipRect);
        }

        x += width;
      }
    }
  }

  private createStyledCell(computedStyle: ComputedStyle): Cell {
    const decorations = (computedStyle.get('text-decoration') ?? '')
      .split(/\s+/)
      .filter((value) => value.length > 0);
    const underline = decorations.includes('underline')
      ? this.parseUnderlineStyle(computedStyle.get('text-decoration-style'))
      : 'none';
    const opacity = Number.parseFloat(computedStyle.get('opacity') ?? '1');

    return {
      char: ' ',
      fg: parseColor(computedStyle.get('color')),
      bg: parseColor(computedStyle.get('background-color')),
      bold: computedStyle.get('font-weight') === 'bold',
      italic: computedStyle.get('font-style') === 'italic',
      underline,
      underlineColor: parseColor(computedStyle.get('text-decoration-color')),
      strikethrough: decorations.includes('line-through'),
      faint: Number.isFinite(opacity) && opacity < 0.5,
      hyperlink: computedStyle.get('hyperlink') ?? null,
    };
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

  private resolveTextStartX(box: LayoutBox, line: string): number {
    const textAlign = box.computedStyle.get('text-align') ?? 'left';
    const lineWidth = cellWidth(line);
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
