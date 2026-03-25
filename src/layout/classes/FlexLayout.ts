import type {Element} from '../../dom/classes/Element';
import type {ComputedStyle} from '../../css/types/index';
import type {LayoutBox} from '../types/index';

/**
 * Parsed box model values extracted from a computed style map.
 */
interface BoxModel {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
}

/**
 * Computes flexbox column layout for terminal UI elements.
 *
 * Implements the Phase 1 layout algorithm where `display: block` is equivalent
 * to `display: flex; flex-direction: column`. Children are stacked vertically
 * within the parent's content area, respecting the box model (padding, margin,
 * border) and `box-sizing`.
 *
 * Phase 2 concerns (row direction, flex-grow/shrink, gap, alignment, wrapping)
 * are out of scope.
 */
export class FlexLayout {
  /**
   * Computes the layout for an element and its children, producing a
   * {@link LayoutBox} tree.
   *
   * Children are expected to be pre-laid-out {@link LayoutBox} objects with
   * positions relative to origin (0, 0). This method stacks them vertically
   * within the element's content area and adjusts their positions to absolute
   * coordinates.
   *
   * Each child's total occupied height (its own height including margins from
   * its layout box) is used to determine the vertical offset for the next child.
   *
   * @param element - The DOM element being laid out.
   * @param computedStyle - The element's resolved CSS property map.
   * @param children - Pre-computed layout boxes for each child element,
   *   positioned relative to (0, 0).
   * @param textLines - Measured text lines for text content within this element.
   * @param availableWidth - The maximum width in terminal cells available to
   *   this element (from the parent's content area or terminal dimensions).
   * @param _availableHeight - The maximum height in terminal cells available to
   *   this element (from the parent's content area or terminal dimensions).
   *   Reserved for Phase 2 vertical constraint solving.
   * @param x - The x offset where this element's margin edge begins.
   * @param y - The y offset where this element's margin edge begins.
   * @returns A fully positioned {@link LayoutBox} for this element.
   */
  layout(
    element: Element,
    computedStyle: ComputedStyle,
    children: LayoutBox[],
    textLines: string[],
    availableWidth: number,
    _availableHeight: number,
    x: number,
    y: number,
  ): LayoutBox {
    const box = this.parseBoxModel(computedStyle);
    const boxSizing = computedStyle.get('box-sizing') ?? 'border-box';
    const explicitWidth = this.parseDimension(computedStyle.get('width'));
    const explicitHeight = this.parseDimension(computedStyle.get('height'));
    const zIndex = this.parseInteger(computedStyle.get('z-index')) ?? 0;

    const horizontalBorderPadding =
      box.borderLeft + box.paddingLeft + box.paddingRight + box.borderRight;
    const verticalBorderPadding =
      box.borderTop + box.paddingTop + box.paddingBottom + box.borderBottom;
    const horizontalMargin = box.marginLeft + box.marginRight;

    // Determine the outer width (excluding margin) based on box-sizing
    let outerWidth: number;

    if (explicitWidth !== null) {
      if (boxSizing === 'border-box') {
        outerWidth = explicitWidth;
      } else {
        outerWidth = explicitWidth + horizontalBorderPadding;
      }
    } else {
      outerWidth = availableWidth - horizontalMargin;
    }

    const contentWidth = Math.max(0, outerWidth - horizontalBorderPadding);

    // Absolute position of the content area
    const contentX = x + box.marginLeft + box.borderLeft + box.paddingLeft;
    const contentY = y + box.marginTop + box.borderTop + box.paddingTop;

    // Stack children vertically in the content area
    let cursorY = contentY;

    for (const child of children) {
      this.offsetBox(child, contentX, cursorY);
      cursorY += child.height;
    }

    // Calculate text height
    const textHeight = textLines.length > 0 ? textLines.length : 0;

    // Sum children heights
    const childrenHeight = this.sumChildrenHeight(children);

    const intrinsicContentHeight = childrenHeight + textHeight;

    // Determine the outer height (excluding margin) based on box-sizing
    let outerHeight: number;

    if (explicitHeight !== null) {
      if (boxSizing === 'border-box') {
        outerHeight = explicitHeight;
      } else {
        outerHeight = explicitHeight + verticalBorderPadding;
      }
    } else {
      outerHeight = intrinsicContentHeight + verticalBorderPadding;
    }

    const contentHeight = Math.max(0, outerHeight - verticalBorderPadding);

    // Total dimensions including margin
    const totalWidth = outerWidth + horizontalMargin;
    const totalHeight = outerHeight + box.marginTop + box.marginBottom;

    return {
      element,
      x,
      y,
      width: totalWidth,
      height: totalHeight,
      contentX,
      contentY,
      contentWidth,
      contentHeight,
      computedStyle,
      textLines: textLines.length > 0 ? textLines : undefined,
      children,
      zIndex,
    };
  }

  /**
   * Extracts box model values (padding, margin, border) from a computed style.
   *
   * Border width is always 1 cell per side when `border-style` is set to a
   * visible value (anything other than `none` or undefined), and 0 otherwise.
   */
  private parseBoxModel(computedStyle: ComputedStyle): BoxModel {
    const borderStyle = computedStyle.get('border-style');
    const hasBorder = borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== '';
    const borderWidth = hasBorder ? 1 : 0;

    return {
      paddingTop: this.parseCellValue(computedStyle.get('padding-top')),
      paddingRight: this.parseCellValue(computedStyle.get('padding-right')),
      paddingBottom: this.parseCellValue(computedStyle.get('padding-bottom')),
      paddingLeft: this.parseCellValue(computedStyle.get('padding-left')),
      marginTop: this.parseCellValue(computedStyle.get('margin-top')),
      marginRight: this.parseCellValue(computedStyle.get('margin-right')),
      marginBottom: this.parseCellValue(computedStyle.get('margin-bottom')),
      marginLeft: this.parseCellValue(computedStyle.get('margin-left')),
      borderTop: borderWidth,
      borderRight: borderWidth,
      borderBottom: borderWidth,
      borderLeft: borderWidth,
    };
  }

  /**
   * Parses a CSS cell value string into an integer. Returns 0 for undefined,
   * empty, `auto`, or non-numeric values.
   */
  private parseCellValue(value: string | undefined): number {
    if (value === undefined || value === '' || value === 'auto') {
      return 0;
    }

    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Parses a dimension value (width/height). Returns null for `auto` or
   * undefined, or the integer cell value otherwise.
   */
  private parseDimension(value: string | undefined): number | null {
    if (value === undefined || value === '' || value === 'auto') {
      return null;
    }

    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? null : Math.max(0, parsed);
  }

  /**
   * Parses an integer value from a string. Returns null for undefined or
   * non-numeric values.
   */
  private parseInteger(value: string | undefined): number | null {
    if (value === undefined || value === '') {
      return null;
    }

    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? null : parsed;
  }

  /**
   * Computes the total height occupied by all children.
   */
  private sumChildrenHeight(children: LayoutBox[]): number {
    let total = 0;

    for (const child of children) {
      total += child.height;
    }

    return total;
  }

  /**
   * Recursively offsets a layout box and all its descendants by the given
   * delta. Children are initially positioned relative to (0, 0), so this
   * translates them to their final absolute coordinates.
   */
  private offsetBox(box: LayoutBox, dx: number, dy: number): void {
    box.x += dx;
    box.y += dy;
    box.contentX += dx;
    box.contentY += dy;

    for (const child of box.children) {
      this.offsetBox(child, dx, dy);
    }
  }
}
