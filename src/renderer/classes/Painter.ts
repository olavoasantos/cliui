import {cellWidth} from '../../layout/utilities/cellWidth';
import {PAINTER_SEGMENTER} from '../constants/segmenter';
import {lerpColor} from '../utilities/lerpColor';
import {parseColor} from '../utilities/parseColor';
import {parseGradientStops} from '../utilities/parseGradientStops';
import type {Cell, RGBColor, UnderlineStyle} from '../types';
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
      if (left.box.zIndex !== right.box.zIndex) {
        return left.box.zIndex - right.box.zIndex;
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

    this.paintBackground(metrics, textCell, buffer, clipRect);
    this.paintBorder(metrics, box.computedStyle, textCell, buffer, clipRect);
    this.paintText(box, textCell, buffer, contentClipRect);
  }

  private flattenBoxes(
    boxes: LayoutBox[],
  ): Array<{box: LayoutBox; clipRect: ClipRect | null; order: number}> {
    const flattened: Array<{box: LayoutBox; clipRect: ClipRect | null; order: number}> = [];
    let order = 0;

    const visit = (box: LayoutBox, clipRect: ClipRect | null): void => {
      flattened.push({box, clipRect, order});
      order += 1;

      const childClipRect = this.createChildClipRect(box, clipRect);

      for (const child of box.children) {
        visit(child, childClipRect);
      }
    };

    for (const box of boxes) {
      visit(box, null);
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

    for (let y = metrics.outerY; y < metrics.outerY + metrics.outerHeight; y += 1) {
      for (let x = metrics.outerX; x < metrics.outerX + metrics.outerWidth; x += 1) {
        if (buffer.get(x, y) === undefined || !this.isWithinClipRect(x, y, clipRect)) {
          continue;
        }

        buffer.set(x, y, {
          ...textCell,
          char: ' ',
        });
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
    const gradientStops = borderColorValue ? parseGradientStops(borderColorValue) : null;
    const solidColor = gradientStops ? null : parseColor(borderColorValue);
    const borderCell: Cell = {
      ...textCell,
      char: ' ',
      fg: solidColor,
    };
    const maxX = metrics.outerX + metrics.outerWidth - 1;
    const maxY = metrics.outerY + metrics.outerHeight - 1;
    const hLen = Math.max(1, metrics.outerWidth);
    const vLen = Math.max(1, metrics.outerHeight);

    /* Corners */
    this.writeCell(
      buffer,
      metrics.outerX,
      metrics.outerY,
      {
        ...borderCell,
        char: characters.topLeft,
        fg: this.gradientColor(gradientStops, solidColor, 0, hLen),
      },
      clipRect,
    );
    this.writeCell(
      buffer,
      maxX,
      metrics.outerY,
      {
        ...borderCell,
        char: characters.topRight,
        fg: this.gradientColor(gradientStops, solidColor, hLen - 1, hLen),
      },
      clipRect,
    );
    this.writeCell(
      buffer,
      metrics.outerX,
      maxY,
      {
        ...borderCell,
        char: characters.bottomLeft,
        fg: this.gradientColor(gradientStops, solidColor, vLen - 1, vLen),
      },
      clipRect,
    );
    this.writeCell(
      buffer,
      maxX,
      maxY,
      {
        ...borderCell,
        char: characters.bottomRight,
        fg: this.gradientColor(gradientStops, solidColor, hLen - 1, hLen),
      },
      clipRect,
    );

    /* Horizontal edges */
    for (let x = metrics.outerX + 1; x < maxX; x += 1) {
      const i = x - metrics.outerX;
      const fg = this.gradientColor(gradientStops, solidColor, i, hLen);

      this.writeCell(
        buffer,
        x,
        metrics.outerY,
        {...borderCell, char: characters.top, fg},
        clipRect,
      );
      this.writeCell(buffer, x, maxY, {...borderCell, char: characters.bottom, fg}, clipRect);
    }

    /* Vertical edges */
    for (let y = metrics.outerY + 1; y < maxY; y += 1) {
      const i = y - metrics.outerY;
      const fg = this.gradientColor(gradientStops, solidColor, i, vLen);

      this.writeCell(
        buffer,
        metrics.outerX,
        y,
        {...borderCell, char: characters.left, fg},
        clipRect,
      );
      this.writeCell(buffer, maxX, y, {...borderCell, char: characters.right, fg}, clipRect);
    }
  }

  /**
   * Resolves the border color for a single cell position along an edge.
   * When a gradient is active, interpolates between stops.  Otherwise
   * returns the solid color.
   */
  private gradientColor(
    stops: RGBColor[] | null,
    solid: RGBColor | null,
    index: number,
    length: number,
  ): RGBColor | null {
    if (!stops || stops.length < 2) {
      return solid;
    }

    const factor = length <= 1 ? 0 : index / (length - 1);
    const segmentCount = stops.length - 1;
    const scaledFactor = factor * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaledFactor), segmentCount - 1);
    const segmentFactor = scaledFactor - segmentIndex;

    return lerpColor(stops[segmentIndex]!, stops[segmentIndex + 1]!, segmentFactor);
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

    for (let row = 0; row < box.textLines.length; row += 1) {
      const y = startY + row;

      if (y >= box.contentY + box.contentHeight) {
        break;
      }

      const line = box.textLines[row]!;
      let x = this.resolveTextStartX(box, line);

      for (const {segment} of PAINTER_SEGMENTER.segment(line)) {
        const width = Math.max(0, cellWidth(segment));

        if (width === 0) {
          continue;
        }

        if (x >= box.contentX + box.contentWidth) {
          break;
        }

        this.writeCell(buffer, x, y, {...textCell, char: segment}, clipRect);

        for (let offset = 1; offset < width; offset += 1) {
          if (x + offset >= box.contentX + box.contentWidth) {
            break;
          }

          this.writeCell(buffer, x + offset, y, {...textCell, char: ' '}, clipRect);
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
    const existing = buffer.get(x, y);

    if (existing === undefined || !this.isWithinClipRect(x, y, clipRect)) {
      return;
    }

    if (cell.bg === null && existing.bg !== null) {
      buffer.set(x, y, {...cell, bg: existing.bg});
      return;
    }

    buffer.set(x, y, cell);
  }

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
