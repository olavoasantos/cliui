import {cellWidth} from '../../layout/utilities/cellWidth';
import {BORDER_CHARACTERS} from '../constants/borders';
import type {Cell, RGBColor, UnderlineStyle} from '../types';
import {CellBuffer} from './CellBuffer';

import type {LayoutBox} from '../../layout/types';
import type {ComputedStyle} from '../../css/types';

const segmenter = new Intl.Segmenter();
const NAMED_COLORS: Record<string, RGBColor> = {
  black: {r: 0, g: 0, b: 0},
  white: {r: 255, g: 255, b: 255},
  red: {r: 255, g: 0, b: 0},
  green: {r: 0, g: 128, b: 0},
  blue: {r: 0, g: 0, b: 255},
  yellow: {r: 255, g: 255, b: 0},
  magenta: {r: 255, g: 0, b: 255},
  cyan: {r: 0, g: 255, b: 255},
  gray: {r: 128, g: 128, b: 128},
  grey: {r: 128, g: 128, b: 128},
  purple: {r: 128, g: 0, b: 128},
};

/**
 * Paints layout boxes into a renderer cell buffer.
 *
 * The painter performs the visual phase of rendering for Phase 1: it fills
 * backgrounds, draws one-cell borders, and writes text with styling
 * attributes into the content area. Children are painted after their parent,
 * so later descendants can visually overwrite earlier cells.
 */
export class Painter {
  /**
   * Paints one or more layout boxes into the provided cell buffer.
   *
   * @param boxes - Layout boxes to paint in order.
   * @param buffer - The destination cell buffer.
   */
  paint(boxes: LayoutBox | LayoutBox[], buffer: CellBuffer): void {
    const list = Array.isArray(boxes) ? boxes : [boxes];

    for (const box of list) {
      this.paintBox(box, buffer);
    }
  }

  private paintBox(box: LayoutBox, buffer: CellBuffer): void {
    const metrics = this.getMetrics(box);
    const textCell = this.createStyledCell(box.computedStyle);

    this.paintBackground(metrics, textCell, buffer);
    this.paintBorder(metrics, box.computedStyle, textCell, buffer);
    this.paintText(box, textCell, buffer);

    for (const child of box.children) {
      this.paintBox(child, buffer);
    }
  }

  private paintBackground(metrics: BoxMetrics, textCell: Cell, buffer: CellBuffer): void {
    for (let y = metrics.outerY; y < metrics.outerY + metrics.outerHeight; y += 1) {
      for (let x = metrics.outerX; x < metrics.outerX + metrics.outerWidth; x += 1) {
        const existing = buffer.get(x, y);

        if (existing === undefined) {
          continue;
        }

        buffer.set(x, y, {
          ...existing,
          bg: textCell.bg,
        });
      }
    }
  }

  private paintBorder(
    metrics: BoxMetrics,
    computedStyle: ComputedStyle,
    textCell: Cell,
    buffer: CellBuffer,
  ): void {
    if (!metrics.hasBorder || metrics.outerWidth <= 0 || metrics.outerHeight <= 0) {
      return;
    }

    const borderStyle = computedStyle.get('border-style') ?? 'single';
    const characters = BORDER_CHARACTERS[borderStyle] ?? BORDER_CHARACTERS.single;
    const borderColor = this.parseColor(computedStyle.get('border-color'));
    const borderCell: Cell = {
      ...textCell,
      char: ' ',
      fg: borderColor,
    };
    const maxX = metrics.outerX + metrics.outerWidth - 1;
    const maxY = metrics.outerY + metrics.outerHeight - 1;

    this.writeCell(buffer, metrics.outerX, metrics.outerY, {
      ...borderCell,
      char: characters.topLeft,
    });
    this.writeCell(buffer, maxX, metrics.outerY, {
      ...borderCell,
      char: characters.topRight,
    });
    this.writeCell(buffer, metrics.outerX, maxY, {
      ...borderCell,
      char: characters.bottomLeft,
    });
    this.writeCell(buffer, maxX, maxY, {
      ...borderCell,
      char: characters.bottomRight,
    });

    for (let x = metrics.outerX + 1; x < maxX; x += 1) {
      this.writeCell(buffer, x, metrics.outerY, {...borderCell, char: characters.horizontal});
      this.writeCell(buffer, x, maxY, {...borderCell, char: characters.horizontal});
    }

    for (let y = metrics.outerY + 1; y < maxY; y += 1) {
      this.writeCell(buffer, metrics.outerX, y, {...borderCell, char: characters.vertical});
      this.writeCell(buffer, maxX, y, {...borderCell, char: characters.vertical});
    }
  }

  private paintText(box: LayoutBox, textCell: Cell, buffer: CellBuffer): void {
    if (box.textLines === undefined || box.textLines.length === 0) {
      return;
    }

    for (let row = 0; row < box.textLines.length; row += 1) {
      const y = box.contentY + row;

      if (y >= box.contentY + box.contentHeight) {
        break;
      }

      let x = box.contentX;

      for (const {segment} of segmenter.segment(box.textLines[row]!)) {
        const width = Math.max(0, cellWidth(segment));

        if (width === 0) {
          continue;
        }

        if (x >= box.contentX + box.contentWidth) {
          break;
        }

        this.writeCell(buffer, x, y, {
          ...textCell,
          char: segment,
        });

        for (let offset = 1; offset < width; offset += 1) {
          if (x + offset >= box.contentX + box.contentWidth) {
            break;
          }

          this.writeCell(buffer, x + offset, y, {
            ...textCell,
            char: ' ',
          });
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
      fg: this.parseColor(computedStyle.get('color')),
      bg: this.parseColor(computedStyle.get('background-color')),
      bold: computedStyle.get('font-weight') === 'bold',
      italic: computedStyle.get('font-style') === 'italic',
      underline,
      underlineColor: this.parseColor(computedStyle.get('text-decoration-color')),
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

  private parseColor(value: string | undefined): RGBColor | null {
    if (value === undefined || value === '' || value === 'inherit') {
      return null;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized in NAMED_COLORS) {
      return {...NAMED_COLORS[normalized]!};
    }

    const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);

    if (shortHexMatch !== null) {
      const [r, g, b] = shortHexMatch[1]!.split('');

      return {
        r: Number.parseInt(`${r}${r}`, 16),
        g: Number.parseInt(`${g}${g}`, 16),
        b: Number.parseInt(`${b}${b}`, 16),
      };
    }

    const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);

    if (hexMatch !== null) {
      return {
        r: Number.parseInt(hexMatch[1]!.slice(0, 2), 16),
        g: Number.parseInt(hexMatch[1]!.slice(2, 4), 16),
        b: Number.parseInt(hexMatch[1]!.slice(4, 6), 16),
      };
    }

    const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);

    if (rgbMatch !== null) {
      return {
        r: this.clampChannel(Number.parseInt(rgbMatch[1]!, 10)),
        g: this.clampChannel(Number.parseInt(rgbMatch[2]!, 10)),
        b: this.clampChannel(Number.parseInt(rgbMatch[3]!, 10)),
      };
    }

    return null;
  }

  private clampChannel(value: number): number {
    return Math.min(255, Math.max(0, value));
  }

  private writeCell(buffer: CellBuffer, x: number, y: number, cell: Cell): void {
    if (buffer.get(x, y) === undefined) {
      return;
    }

    buffer.set(x, y, cell);
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

interface BoxMetrics {
  outerX: number;
  outerY: number;
  outerWidth: number;
  outerHeight: number;
  hasBorder: boolean;
}
