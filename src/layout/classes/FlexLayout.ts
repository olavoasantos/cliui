import {cellWidth} from '../utilities/cellWidth';
import type {Element} from '../../dom/classes/Element';
import type {ComputedStyle} from '../../css/types';
import type {LayoutBox} from '../types';
import type {BoxModel} from '../types/BoxModel';
import type {FlexLine} from '../types/FlexLine';

/**
 * Computes flexbox layout for terminal UI elements.
 *
 * Phase 1 implemented `display: block` as flex column layout. Phase 2 extends
 * the same class to support all four `flex-direction` values: `row`, `column`,
 * `row-reverse`, and `column-reverse`.
 *
 * Later flexbox concerns such as grow/shrink, gap, alignment, wrapping, and
 * constraints are added in later milestone tasks.
 */
export class FlexLayout {
  /**
   * Computes the layout for an element and its children, producing a
   * {@link LayoutBox} tree.
   *
   * Children are expected to be pre-laid-out {@link LayoutBox} objects with
   * positions relative to origin (0, 0). This method positions them within the
   * element's content area according to the resolved flex direction and adjusts
   * them to absolute coordinates.
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
    const minWidth = this.parseDimension(computedStyle.get('min-width'));
    const minHeight = this.parseDimension(computedStyle.get('min-height'));
    const maxWidth = this.parseDimension(computedStyle.get('max-width'));
    const maxHeight = this.parseDimension(computedStyle.get('max-height'));
    const zIndex = this.parseInteger(computedStyle.get('z-index')) ?? 0;
    const flexDirection = computedStyle.get('flex-direction') ?? 'column';
    const isRowDirection = flexDirection === 'row' || flexDirection === 'row-reverse';
    const isWrapEnabled = computedStyle.get('flex-wrap') === 'wrap';
    const isAbsolute = computedStyle.get('position') === 'absolute';

    const horizontalBorderPadding =
      box.borderLeft + box.paddingLeft + box.paddingRight + box.borderRight;
    const verticalBorderPadding =
      box.borderTop + box.paddingTop + box.paddingBottom + box.borderBottom;
    const horizontalMargin = box.marginLeft + box.marginRight;

    let outerWidth: number;

    if (explicitWidth !== null) {
      if (boxSizing === 'border-box') {
        outerWidth = explicitWidth;
      } else {
        outerWidth = explicitWidth + horizontalBorderPadding;
      }
    } else if (isAbsolute) {
      outerWidth = this.resolveIntrinsicContentWidth(
        children,
        textLines,
        flexDirection,
        computedStyle,
      );

      if (boxSizing === 'border-box') {
        outerWidth += horizontalBorderPadding;
      }
    } else {
      outerWidth = availableWidth - horizontalMargin;
    }

    outerWidth = this.clampSize(outerWidth, minWidth, maxWidth);

    const contentWidth = Math.max(0, outerWidth - horizontalBorderPadding);
    const contentX = x + box.marginLeft + box.borderLeft + box.paddingLeft;
    const contentY = y + box.marginTop + box.borderTop + box.paddingTop;
    const textHeight = textLines.length > 0 ? textLines.length : 0;
    const explicitContentHeight =
      explicitHeight === null
        ? null
        : boxSizing === 'border-box'
          ? Math.max(0, explicitHeight - verticalBorderPadding)
          : explicitHeight;
    const availableContentHeight =
      explicitContentHeight ??
      Math.max(0, _availableHeight - box.marginTop - box.marginBottom - verticalBorderPadding);

    const mainGap = isRowDirection
      ? this.parseCellValue(computedStyle.get('column-gap'))
      : this.parseCellValue(computedStyle.get('row-gap'));
    const lineGap = isRowDirection
      ? this.parseCellValue(computedStyle.get('row-gap'))
      : this.parseCellValue(computedStyle.get('column-gap'));
    const availableMainSize = isRowDirection ? contentWidth : availableContentHeight;

    let lines: FlexLine[];

    if (isWrapEnabled && isRowDirection) {
      lines = this.buildRowWrapLines(children, contentWidth, mainGap);

      for (const line of lines) {
        this.applyFlexSizing(
          line.children,
          true,
          Math.max(0, contentWidth - Math.max(0, line.children.length - 1) * mainGap),
        );
        line.crossSize = this.maxChildHeight(line.children);
      }
    } else {
      this.applyFlexSizing(
        children,
        isRowDirection,
        Math.max(0, availableMainSize - Math.max(0, children.length - 1) * mainGap),
      );
      lines = [
        {children, crossSize: isRowDirection ? this.maxChildHeight(children) : contentWidth},
      ];
    }

    const intrinsicContentHeight =
      isWrapEnabled && isRowDirection
        ? Math.max(
            textHeight,
            this.sumLineCrossSizes(lines) + Math.max(0, lines.length - 1) * lineGap,
          )
        : isRowDirection
          ? Math.max(textHeight, this.maxChildHeight(children))
          : this.sumChildrenHeight(children) +
            Math.max(0, children.length - 1) * mainGap +
            textHeight;

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

    outerHeight = this.clampSize(outerHeight, minHeight, maxHeight);

    const contentHeight = Math.max(0, outerHeight - verticalBorderPadding);

    if (isWrapEnabled && isRowDirection) {
      this.positionWrappedRows(lines, computedStyle, contentX, contentY, contentWidth, lineGap);
    } else {
      this.positionChildren(
        children,
        computedStyle,
        contentX,
        contentY,
        flexDirection,
        isRowDirection ? contentWidth : contentHeight,
        isRowDirection ? contentHeight : contentWidth,
        mainGap,
      );
    }
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
   * Resolves the intrinsic content width used to shrink-wrap absolute boxes.
   */
  private resolveIntrinsicContentWidth(
    children: LayoutBox[],
    textLines: string[],
    flexDirection: string,
    computedStyle: ComputedStyle,
  ): number {
    const textWidth = this.maxTextWidth(textLines);
    const isRowDirection = flexDirection === 'row' || flexDirection === 'row-reverse';

    if (children.length === 0) {
      return textWidth;
    }

    if (isRowDirection) {
      const gap = this.parseCellValue(computedStyle.get('column-gap'));
      return Math.max(
        textWidth,
        this.sumChildrenWidth(children) + Math.max(0, children.length - 1) * gap,
      );
    }

    return Math.max(textWidth, this.maxChildWidth(children));
  }

  /**
   * Measures the widest text line in terminal cells.
   */
  private maxTextWidth(textLines: string[]): number {
    let maxWidth = 0;

    for (const line of textLines) {
      maxWidth = Math.max(maxWidth, cellWidth(line));
    }

    return maxWidth;
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
   * Clamps a size between optional minimum and maximum bounds.
   */
  private clampSize(size: number, min: number | null, max: number | null): number {
    let result = Math.max(0, size);

    if (min !== null) {
      result = Math.max(result, min);
    }

    if (max !== null) {
      result = Math.min(result, max);
    }

    return result;
  }

  /**
   * Positions child boxes inside the container content area according to the
   * resolved flex direction.
   */
  private positionChildren(
    children: LayoutBox[],
    computedStyle: ComputedStyle,
    contentX: number,
    contentY: number,
    flexDirection: string,
    availableMainSize: number,
    availableCrossSize: number,
    gap: number,
  ): void {
    switch (flexDirection) {
      case 'row':
        this.positionRow(
          children,
          computedStyle,
          contentX,
          contentY,
          availableMainSize,
          availableCrossSize,
          gap,
          false,
        );
        break;
      case 'row-reverse':
        this.positionRow(
          children,
          computedStyle,
          contentX,
          contentY,
          availableMainSize,
          availableCrossSize,
          gap,
          true,
        );
        break;
      case 'column-reverse':
        this.positionColumn(
          children,
          computedStyle,
          contentX,
          contentY,
          availableMainSize,
          availableCrossSize,
          gap,
          true,
        );
        break;
      case 'column':
      default:
        this.positionColumn(
          children,
          computedStyle,
          contentX,
          contentY,
          availableMainSize,
          availableCrossSize,
          gap,
          false,
        );
        break;
    }
  }

  /**
   * Positions child boxes along the vertical axis.
   */
  private positionColumn(
    children: LayoutBox[],
    computedStyle: ComputedStyle,
    contentX: number,
    contentY: number,
    availableMainSize: number,
    availableCrossSize: number,
    gap: number,
    reverse: boolean,
  ): void {
    const orderedChildren = this.iterateChildren(children, reverse);
    const {startOffset, betweenSpace} = this.resolveMainAxisSpacing(
      computedStyle,
      orderedChildren,
      availableMainSize,
      false,
      gap,
    );
    let cursorY = contentY + startOffset;

    for (let index = 0; index < orderedChildren.length; index += 1) {
      const child = orderedChildren[index]!;
      const childX =
        contentX + this.resolveCrossAxisOffset(child, computedStyle, availableCrossSize, true);

      this.offsetBox(child, childX, cursorY);
      cursorY += child.height;

      if (index < orderedChildren.length - 1) {
        cursorY += gap + betweenSpace;
      }
    }
  }

  /**
   * Positions child boxes along the horizontal axis.
   */
  private positionRow(
    children: LayoutBox[],
    computedStyle: ComputedStyle,
    contentX: number,
    contentY: number,
    availableMainSize: number,
    availableCrossSize: number,
    gap: number,
    reverse: boolean,
  ): void {
    const orderedChildren = this.iterateChildren(children, reverse);
    const {startOffset, betweenSpace} = this.resolveMainAxisSpacing(
      computedStyle,
      orderedChildren,
      availableMainSize,
      true,
      gap,
    );
    let cursorX = contentX + startOffset;

    for (let index = 0; index < orderedChildren.length; index += 1) {
      const child = orderedChildren[index]!;
      const childY =
        contentY + this.resolveCrossAxisOffset(child, computedStyle, availableCrossSize, false);

      this.offsetBox(child, cursorX, childY);
      cursorX += child.width;

      if (index < orderedChildren.length - 1) {
        cursorX += gap + betweenSpace;
      }
    }
  }

  /**
   * Returns the child boxes in forward or reverse visual order.
   */
  private iterateChildren(children: LayoutBox[], reverse: boolean): LayoutBox[] {
    return reverse ? [...children].reverse() : children;
  }

  /**
   * Builds wrapped lines for row-direction layout.
   */
  private buildRowWrapLines(
    children: LayoutBox[],
    availableWidth: number,
    gap: number,
  ): FlexLine[] {
    const lines: FlexLine[] = [];
    let currentChildren: LayoutBox[] = [];
    let currentWidth = 0;

    for (const child of children) {
      const childWidth = this.resolveFlexBasis(child, true);
      const nextWidth = currentChildren.length === 0 ? childWidth : currentWidth + gap + childWidth;

      if (currentChildren.length > 0 && nextWidth > availableWidth) {
        lines.push({children: currentChildren, crossSize: this.maxChildHeight(currentChildren)});
        currentChildren = [child];
        currentWidth = childWidth;
      } else {
        currentChildren.push(child);
        currentWidth = nextWidth;
      }
    }

    if (currentChildren.length > 0) {
      lines.push({children: currentChildren, crossSize: this.maxChildHeight(currentChildren)});
    }

    return lines;
  }

  /**
   * Positions wrapped row lines and stacks them vertically.
   */
  private positionWrappedRows(
    lines: FlexLine[],
    computedStyle: ComputedStyle,
    contentX: number,
    contentY: number,
    contentWidth: number,
    lineGap: number,
  ): void {
    let cursorY = contentY;
    const itemGap = this.parseCellValue(computedStyle.get('column-gap'));

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;

      this.positionRow(
        line.children,
        computedStyle,
        contentX,
        cursorY,
        contentWidth,
        line.crossSize,
        itemGap,
        false,
      );

      cursorY += line.crossSize;

      if (index < lines.length - 1) {
        cursorY += lineGap;
      }
    }
  }

  /**
   * Computes the total cross-axis size occupied by wrapped lines.
   */
  private sumLineCrossSizes(lines: FlexLine[]): number {
    let total = 0;

    for (const line of lines) {
      total += line.crossSize;
    }

    return total;
  }

  /**
   * Resolves starting offset and inter-item spacing for `justify-content`.
   */
  private resolveMainAxisSpacing(
    computedStyle: ComputedStyle,
    children: LayoutBox[],
    availableMainSize: number,
    isRowDirection: boolean,
    gap: number,
  ): {startOffset: number; betweenSpace: number} {
    const justifyContent = computedStyle.get('justify-content') ?? 'flex-start';
    const totalChildrenSize = children.reduce(
      (sum, child) => sum + this.getMainSize(child, isRowDirection),
      0,
    );
    const baseGapSpace = Math.max(0, children.length - 1) * gap;
    const freeSpace = Math.max(0, availableMainSize - totalChildrenSize - baseGapSpace);

    switch (justifyContent) {
      case 'flex-end':
        return {startOffset: freeSpace, betweenSpace: 0};
      case 'center':
        return {startOffset: Math.floor(freeSpace / 2), betweenSpace: 0};
      case 'space-between':
        return {
          startOffset: 0,
          betweenSpace: children.length > 1 ? Math.floor(freeSpace / (children.length - 1)) : 0,
        };
      case 'space-around': {
        const betweenSpace = children.length > 0 ? Math.floor(freeSpace / children.length) : 0;

        return {
          startOffset: Math.floor(betweenSpace / 2),
          betweenSpace,
        };
      }
      case 'space-evenly': {
        const evenSpace = Math.floor(freeSpace / (children.length + 1));

        return {
          startOffset: evenSpace,
          betweenSpace: evenSpace,
        };
      }
      case 'flex-start':
      default:
        return {startOffset: 0, betweenSpace: 0};
    }
  }

  /**
   * Resolves cross-axis offset and optional stretching for a child.
   */
  private resolveCrossAxisOffset(
    child: LayoutBox,
    computedStyle: ComputedStyle,
    availableCrossSize: number,
    isColumnDirection: boolean,
  ): number {
    const parentAlign = computedStyle.get('align-items') ?? 'flex-start';
    const childAlign = child.computedStyle.get('align-self');
    const align =
      childAlign === undefined || childAlign === '' || childAlign === 'auto'
        ? parentAlign
        : childAlign;
    const childCrossSize = this.getCrossSize(child, !isColumnDirection);
    const freeSpace = Math.max(0, availableCrossSize - childCrossSize);

    switch (align) {
      case 'flex-end':
        return freeSpace;
      case 'center':
        return Math.floor(freeSpace / 2);
      case 'stretch':
        this.setCrossSize(child, !isColumnDirection, availableCrossSize);
        return 0;
      case 'flex-start':
      default:
        return 0;
    }
  }

  /**
   * Applies `flex-grow`, `flex-shrink`, and `flex-basis` along the current
   * main axis.
   */
  private applyFlexSizing(
    children: LayoutBox[],
    isRowDirection: boolean,
    availableMainSize: number,
  ): void {
    if (children.length === 0) {
      return;
    }

    const childStates = children.map((child) => {
      const baseSize = this.resolveFlexBasis(child, isRowDirection);
      const grow = this.parseFlexFactor(child.computedStyle.get('flex-grow'), 0);
      const shrink = this.parseFlexFactor(child.computedStyle.get('flex-shrink'), 1);

      return {
        child,
        baseSize,
        grow,
        shrink,
        targetSize: baseSize,
      };
    });
    const totalBaseSize = childStates.reduce((sum, state) => sum + state.baseSize, 0);
    const freeSpace = availableMainSize - totalBaseSize;

    if (freeSpace > 0) {
      const totalGrow = childStates.reduce((sum, state) => sum + state.grow, 0);

      if (totalGrow > 0) {
        let remainder = freeSpace;

        for (let index = 0; index < childStates.length; index += 1) {
          const state = childStates[index]!;
          const extra =
            index === childStates.length - 1
              ? remainder
              : Math.round((freeSpace * state.grow) / totalGrow);

          state.targetSize = state.baseSize + extra;
          remainder -= extra;
        }
      }
    } else if (freeSpace < 0) {
      const shrinkWeights = childStates.map((state) => state.shrink * state.baseSize);
      const totalShrinkWeight = shrinkWeights.reduce((sum, weight) => sum + weight, 0);

      if (totalShrinkWeight > 0) {
        let remainingOverflow = -freeSpace;

        for (let index = 0; index < childStates.length; index += 1) {
          const state = childStates[index]!;
          const weight = shrinkWeights[index]!;
          const reduction =
            index === childStates.length - 1
              ? remainingOverflow
              : Math.round((-freeSpace * weight) / totalShrinkWeight);

          state.targetSize = Math.max(0, state.baseSize - reduction);
          remainingOverflow -= reduction;
        }
      }
    }

    for (const state of childStates) {
      this.setMainSize(state.child, isRowDirection, state.targetSize);
    }
  }

  /**
   * Resolves a child's flex base size on the current main axis.
   */
  private resolveFlexBasis(child: LayoutBox, isRowDirection: boolean): number {
    const basis = child.computedStyle.get('flex-basis');

    if (basis === undefined || basis === '' || basis === 'auto') {
      return this.getMainSize(child, isRowDirection);
    }

    const parsed = this.parseDimension(basis);

    return parsed ?? this.getMainSize(child, isRowDirection);
  }

  /**
   * Parses a flex factor with a fallback default.
   */
  private parseFlexFactor(value: string | undefined, fallback: number): number {
    if (value === undefined || value === '') {
      return fallback;
    }

    const parsed = Number.parseFloat(value);

    return Number.isNaN(parsed) ? fallback : Math.max(0, parsed);
  }

  /**
   * Returns a layout box size on the main axis.
   */
  private getMainSize(box: LayoutBox, isRowDirection: boolean): number {
    return isRowDirection ? box.width : box.height;
  }

  /**
   * Returns a layout box size on the cross axis.
   */
  private getCrossSize(box: LayoutBox, isRowDirection: boolean): number {
    return isRowDirection ? box.height : box.width;
  }

  /**
   * Sets a layout box size on the main axis while preserving its box-model
   * insets.
   */
  private setMainSize(box: LayoutBox, isRowDirection: boolean, size: number): void {
    const min = this.parseDimension(
      box.computedStyle.get(isRowDirection ? 'min-width' : 'min-height'),
    );
    const max = this.parseDimension(
      box.computedStyle.get(isRowDirection ? 'max-width' : 'max-height'),
    );
    const clampedSize = this.clampSize(size, min, max);

    if (isRowDirection) {
      const horizontalInset = box.width - box.contentWidth;

      box.width = clampedSize;
      box.contentWidth = Math.max(0, clampedSize - horizontalInset);
      return;
    }

    const verticalInset = box.height - box.contentHeight;

    box.height = clampedSize;
    box.contentHeight = Math.max(0, clampedSize - verticalInset);
  }

  /**
   * Sets a layout box size on the cross axis while preserving its box-model
   * insets.
   */
  private setCrossSize(box: LayoutBox, isRowDirection: boolean, size: number): void {
    const min = this.parseDimension(
      box.computedStyle.get(isRowDirection ? 'min-height' : 'min-width'),
    );
    const max = this.parseDimension(
      box.computedStyle.get(isRowDirection ? 'max-height' : 'max-width'),
    );
    const clampedSize = this.clampSize(size, min, max);

    if (isRowDirection) {
      const verticalInset = box.height - box.contentHeight;

      box.height = clampedSize;
      box.contentHeight = Math.max(0, clampedSize - verticalInset);
      return;
    }

    const horizontalInset = box.width - box.contentWidth;

    box.width = clampedSize;
    box.contentWidth = Math.max(0, clampedSize - horizontalInset);
  }

  /**
   * Computes the total width occupied by all children.
   */
  private sumChildrenWidth(children: LayoutBox[]): number {
    let total = 0;

    for (const child of children) {
      total += child.width;
    }

    return total;
  }

  /**
   * Computes the widest child width.
   */
  private maxChildWidth(children: LayoutBox[]): number {
    let maxWidth = 0;

    for (const child of children) {
      maxWidth = Math.max(maxWidth, child.width);
    }

    return maxWidth;
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
   * Computes the tallest child height.
   */
  private maxChildHeight(children: LayoutBox[]): number {
    let maxHeight = 0;

    for (const child of children) {
      maxHeight = Math.max(maxHeight, child.height);
    }

    return maxHeight;
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
