import {cellWidth} from '../utilities/cellWidth';
import type {Element} from '../../dom/classes/Element';
import type {ComputedStyle} from '../../css/types';
import type {LayoutBox} from '../types';
import type {BoxModel} from '../types/BoxModel';
import type {FlexChildBasis} from '../types/FlexChildBasis';
import type {FlexContext} from '../types/FlexContext';
import type {FlexLine} from '../types/FlexLine';
import type {FlexResolvedChild} from '../types/FlexResolvedChild';
import type {FlexSizingResult} from '../types/FlexSizingResult';

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
   * This is a compatibility bridge that delegates to {@link computeSizes} and
   * {@link position}. New code should call those two methods directly to
   * enable two-phase layout.
   *
   * @param element - The DOM element being laid out.
   * @param computedStyle - The element's resolved CSS property map.
   * @param children - Pre-computed layout boxes for each child element.
   * @param textLines - Measured text lines for text content within this element.
   * @param availableWidth - The maximum width in terminal cells.
   * @param availableHeight - The maximum height in terminal cells.
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
    availableHeight: number,
    x: number,
    y: number,
  ): LayoutBox {
    const flexDirection = computedStyle.get('flex-direction') ?? 'column';
    const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';

    const childBases: FlexChildBasis[] = new Array(children.length);

    for (let i = 0; i < children.length; i += 1) {
      const child = children[i]!;

      childBases[i] = {
        intrinsicMainSize: isRow ? child.width : child.height,
        intrinsicCrossSize: isRow ? child.height : child.width,
        computedStyle: child.computedStyle,
      };
    }

    const sizing = this.computeSizes(
      element,
      computedStyle,
      childBases,
      textLines,
      availableWidth,
      availableHeight,
    );

    // Apply resolved sizes to existing LayoutBoxes
    for (let i = 0; i < children.length; i += 1) {
      const resolved = sizing.resolvedChildren[i]!;
      const child = children[i]!;

      if (isRow) {
        this.setMainSizeUnclamped(child, true, resolved.mainSize);

        if (resolved.stretched) {
          this.setCrossSizeUnclamped(child, true, resolved.crossSize);
        }
      } else {
        this.setMainSizeUnclamped(child, false, resolved.mainSize);

        if (resolved.stretched) {
          this.setCrossSizeUnclamped(child, false, resolved.crossSize);
        }
      }
    }

    return this.position(element, computedStyle, children, textLines, sizing.context, x, y);
  }

  /**
   * Phase 1: Computes resolved flex dimensions for all children without
   * positioning them.
   *
   * Takes intrinsic child measurements ({@link FlexChildBasis}) and returns
   * the final main-axis and cross-axis size each child should have after flex
   * grow/shrink distribution and stretch resolution.
   *
   * The returned {@link FlexSizingResult.context} must be passed to
   * {@link position} for the positioning phase.
   *
   * @param element - The DOM element being laid out.
   * @param computedStyle - The element's resolved CSS property map.
   * @param childBases - Intrinsic measurements for each in-flow child.
   * @param textLines - Measured text lines for text content within this element.
   * @param availableWidth - The maximum width in terminal cells.
   * @param availableHeight - The maximum height in terminal cells.
   * @returns Resolved dimensions per child and the context for positioning.
   */
  computeSizes(
    _element: Element,
    computedStyle: ComputedStyle,
    childBases: FlexChildBasis[],
    textLines: string[],
    availableWidth: number,
    availableHeight: number,
  ): FlexSizingResult {
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
    const flexWrap = computedStyle.get('flex-wrap') ?? 'nowrap';
    const isWrapEnabled = flexWrap === 'wrap' || flexWrap === 'wrap-reverse';
    const isWrapReverse = flexWrap === 'wrap-reverse';
    const isAbsolute = computedStyle.get('position') === 'absolute';

    const horizontalBorderPadding =
      box.borderLeft + box.paddingLeft + box.paddingRight + box.borderRight;
    const verticalBorderPadding =
      box.borderTop + box.paddingTop + box.paddingBottom + box.borderBottom;
    const horizontalMargin = box.marginLeft + box.marginRight;

    // --- Resolve container width ---

    let outerWidth: number;

    if (explicitWidth !== null) {
      outerWidth =
        boxSizing === 'border-box' ? explicitWidth : explicitWidth + horizontalBorderPadding;
    } else if (isAbsolute || computedStyle.get('display') === 'inline') {
      outerWidth = this.resolveIntrinsicContentWidthFromBases(
        childBases,
        textLines,
        isRowDirection,
        computedStyle,
      );

      if (boxSizing === 'border-box') {
        outerWidth += horizontalBorderPadding;
      }

      outerWidth = Math.min(outerWidth, availableWidth - horizontalMargin);
    } else {
      outerWidth = availableWidth - horizontalMargin;
    }

    outerWidth = this.clampSize(outerWidth, minWidth, maxWidth);

    let contentWidth = Math.max(0, outerWidth - horizontalBorderPadding);

    const explicitContentHeight =
      explicitHeight === null
        ? null
        : boxSizing === 'border-box'
          ? Math.max(0, explicitHeight - verticalBorderPadding)
          : explicitHeight;
    const availableContentHeight =
      explicitContentHeight ??
      Math.max(0, availableHeight - box.marginTop - box.marginBottom - verticalBorderPadding);

    const mainGap = isRowDirection
      ? this.parseCellValue(computedStyle.get('column-gap'))
      : this.parseCellValue(computedStyle.get('row-gap'));
    const lineGap = isRowDirection
      ? this.parseCellValue(computedStyle.get('row-gap'))
      : this.parseCellValue(computedStyle.get('column-gap'));
    const availableMainSize = isRowDirection ? contentWidth : availableContentHeight;
    const textHeight = textLines.length > 0 ? textLines.length : 0;

    // --- Compute flex basis per child ---

    const baseSizes = new Array<number>(childBases.length);

    for (let i = 0; i < childBases.length; i += 1) {
      baseSizes[i] = this.resolveFlexBasisFromBasis(childBases[i]!, isRowDirection);
    }

    // --- Column direction: avoid shrinking below intrinsic height ---

    let childrenIntrinsicMainSize = 0;

    for (let i = 0; i < baseSizes.length; i += 1) {
      childrenIntrinsicMainSize += isRowDirection
        ? baseSizes[i]!
        : childBases[i]!.intrinsicMainSize;
    }

    childrenIntrinsicMainSize +=
      Math.max(0, childBases.length - 1) * mainGap + (isRowDirection ? 0 : textHeight);

    // For overflow: scroll containers, children should overflow rather
    // than shrink to fit the viewport. Use the larger of available and
    // intrinsic content size so flex-shrink does not collapse children.
    const isScrollContainer = computedStyle.get('overflow') === 'scroll';
    const flexSizingMainSize =
      !isRowDirection && (explicitHeight === null || isScrollContainer)
        ? Math.max(availableMainSize, childrenIntrinsicMainSize)
        : availableMainSize;

    // --- Build flex lines and apply flex sizing ---

    const resolvedMainSizes = [...baseSizes];
    const lineChildIndices: number[][] = [];
    const lineCrossSizes: number[] = [];

    if (isWrapEnabled && isRowDirection) {
      // Build wrapped lines
      const lines = this.buildWrapLinesFromBases(baseSizes, contentWidth, mainGap);

      for (const line of lines) {
        lineChildIndices.push(line);

        const lineAvailable = Math.max(0, contentWidth - Math.max(0, line.length - 1) * mainGap);

        this.applyFlexSizingOnIndices(
          childBases,
          resolvedMainSizes,
          line,
          isRowDirection,
          lineAvailable,
        );

        let maxCross = 0;

        for (const idx of line) {
          const cross = childBases[idx]!.intrinsicCrossSize;

          if (cross > maxCross) {
            maxCross = cross;
          }
        }

        lineCrossSizes.push(maxCross);
      }
    } else {
      const allIndices: number[] = new Array(childBases.length);

      for (let i = 0; i < childBases.length; i += 1) {
        allIndices[i] = i;
      }

      lineChildIndices.push(allIndices);

      const lineAvailable = Math.max(
        0,
        flexSizingMainSize - Math.max(0, childBases.length - 1) * mainGap,
      );

      this.applyFlexSizingOnIndices(
        childBases,
        resolvedMainSizes,
        allIndices,
        isRowDirection,
        lineAvailable,
      );

      if (isRowDirection) {
        let maxCross = 0;

        for (const basis of childBases) {
          if (basis.intrinsicCrossSize > maxCross) {
            maxCross = basis.intrinsicCrossSize;
          }
        }

        lineCrossSizes.push(maxCross);
      } else {
        lineCrossSizes.push(contentWidth);
      }
    }

    // --- FitContent: recompute width for shrink-wrap containers ---

    if (
      isRowDirection &&
      !isWrapEnabled &&
      explicitWidth === null &&
      (isAbsolute || computedStyle.get('display') === 'inline')
    ) {
      let flexedSum = 0;

      for (const size of resolvedMainSizes) {
        flexedSum += size;
      }

      const gap =
        childBases.length > 0
          ? this.parseCellValue(computedStyle.get('column-gap')) *
            Math.max(0, childBases.length - 1)
          : 0;
      const flexedIntrinsic = Math.max(this.maxTextWidth(textLines), flexedSum + gap);
      let newOuterWidth =
        boxSizing === 'border-box' ? flexedIntrinsic + horizontalBorderPadding : flexedIntrinsic;

      newOuterWidth = Math.min(newOuterWidth, availableWidth - horizontalMargin);
      outerWidth = this.clampSize(newOuterWidth, minWidth, maxWidth);
      contentWidth = Math.max(0, outerWidth - horizontalBorderPadding);
    }

    // --- Resolve cross-axis sizes (stretch detection) ---

    const alignItems = computedStyle.get('align-items') ?? 'stretch';
    const resolvedChildren: FlexResolvedChild[] = new Array(childBases.length);

    for (let i = 0; i < childBases.length; i += 1) {
      const basis = childBases[i]!;
      let crossSize = basis.intrinsicCrossSize;
      let stretched = false;

      // Find which line this child is on
      const lineCrossSize = this.findLineCrossSize(i, lineChildIndices, lineCrossSizes);

      // Determine effective alignment
      const selfAlign = basis.computedStyle.get('align-self');
      const effectiveAlign =
        selfAlign !== undefined && selfAlign !== '' && selfAlign !== 'auto'
          ? selfAlign
          : alignItems;

      if (effectiveAlign === 'stretch') {
        // Only stretch if no explicit cross-axis dimension
        const crossDimProp = isRowDirection ? 'height' : 'width';
        const explicitCross = basis.computedStyle.get(crossDimProp);
        const hasExplicitCross =
          explicitCross !== undefined && explicitCross !== '' && explicitCross !== 'auto';

        // Only stretch if no cross-axis auto margins
        const crossStartProp = isRowDirection ? 'margin-top' : 'margin-left';
        const crossEndProp = isRowDirection ? 'margin-bottom' : 'margin-right';
        const hasAutoMargin =
          basis.computedStyle.get(crossStartProp) === 'auto' ||
          basis.computedStyle.get(crossEndProp) === 'auto';

        if (!hasExplicitCross && !hasAutoMargin && lineCrossSize > crossSize) {
          // Clamp to child's cross-axis min/max
          const minCross = this.parseDimension(
            basis.computedStyle.get(isRowDirection ? 'min-height' : 'min-width'),
          );
          const maxCross = this.parseDimension(
            basis.computedStyle.get(isRowDirection ? 'max-height' : 'max-width'),
          );

          crossSize = this.clampSize(lineCrossSize, minCross, maxCross);
          stretched = crossSize !== basis.intrinsicCrossSize;
        }
      }

      resolvedChildren[i] = {
        mainSize: resolvedMainSizes[i]!,
        crossSize,
        stretched,
      };
    }

    // --- Compute container height ---

    let intrinsicContentHeight: number;

    if (isWrapEnabled && isRowDirection) {
      let totalLineCross = 0;

      for (const cs of lineCrossSizes) {
        totalLineCross += cs;
      }

      intrinsicContentHeight = Math.max(
        textHeight,
        totalLineCross + Math.max(0, lineCrossSizes.length - 1) * lineGap,
      );
    } else if (isRowDirection) {
      intrinsicContentHeight = Math.max(textHeight, lineCrossSizes[0] ?? 0);
    } else {
      let totalMainSizes = 0;

      for (const s of resolvedMainSizes) {
        totalMainSizes += s;
      }

      intrinsicContentHeight =
        totalMainSizes + Math.max(0, childBases.length - 1) * mainGap + textHeight;
    }

    let outerHeight: number;

    if (explicitHeight !== null) {
      outerHeight =
        boxSizing === 'border-box' ? explicitHeight : explicitHeight + verticalBorderPadding;
    } else {
      outerHeight = intrinsicContentHeight + verticalBorderPadding;
    }

    const overflow = computedStyle.get('overflow');

    if (overflow === 'scroll' && explicitHeight === null) {
      const maxViewportHeight = availableHeight - box.marginTop - box.marginBottom;

      if (outerHeight > maxViewportHeight && maxViewportHeight > 0) {
        outerHeight = maxViewportHeight;
      }
    }

    outerHeight = this.clampSize(outerHeight, minHeight, maxHeight);

    const contentHeight = Math.max(0, outerHeight - verticalBorderPadding);

    return {
      resolvedChildren,
      context: {
        outerWidth,
        outerHeight,
        contentWidth,
        contentHeight,
        boxModel: box,
        horizontalMargin,
        horizontalBorderPadding,
        verticalBorderPadding,
        flexDirection,
        isRowDirection,
        isWrapEnabled,
        isWrapReverse,
        mainGap,
        lineGap,
        zIndex,
        lineChildIndices,
        lineCrossSizes,
      },
    };
  }

  /**
   * Phase 2: Positions fully-laid-out children within the container and returns
   * the final {@link LayoutBox}.
   *
   * @param element - The DOM element being laid out.
   * @param computedStyle - The element's resolved CSS property map.
   * @param children - Fully laid-out child boxes at their resolved sizes.
   * @param textLines - Measured text lines for text content.
   * @param ctx - The {@link FlexContext} from {@link computeSizes}.
   * @param x - The x offset where this element's margin edge begins.
   * @param y - The y offset where this element's margin edge begins.
   * @returns A fully positioned {@link LayoutBox}.
   */
  position(
    element: Element,
    computedStyle: ComputedStyle,
    children: LayoutBox[],
    textLines: string[],
    ctx: FlexContext,
    x: number,
    y: number,
  ): LayoutBox {
    const contentX =
      x + ctx.boxModel.marginLeft + ctx.boxModel.borderLeft + ctx.boxModel.paddingLeft;
    const contentY = y + ctx.boxModel.marginTop + ctx.boxModel.borderTop + ctx.boxModel.paddingTop;

    if (ctx.isWrapEnabled && ctx.isRowDirection) {
      const lines: FlexLine[] = ctx.lineChildIndices.map((indices, lineIdx) => ({
        children: indices.map((i) => children[i]!),
        crossSize: ctx.lineCrossSizes[lineIdx]!,
      }));

      if (ctx.isWrapReverse) {
        lines.reverse();
      }

      // Offset past text on the main axis when text and children coexist
      const textMainOffset = textLines.length > 0 ? this.maxTextWidth(textLines) : 0;

      this.positionWrappedRows(
        lines,
        computedStyle,
        contentX + textMainOffset,
        contentY,
        Math.max(0, ctx.contentWidth - textMainOffset),
        ctx.lineGap,
      );
    } else {
      // When text and children coexist, children must be positioned
      // past the text on the main axis so they don't overlap (BUG-6).
      const textMainOffset =
        textLines.length > 0
          ? ctx.isRowDirection
            ? this.maxTextWidth(textLines)
            : textLines.length
          : 0;
      const childContentX = ctx.isRowDirection ? contentX + textMainOffset : contentX;
      const childContentY = ctx.isRowDirection ? contentY : contentY + textMainOffset;
      const childAvailableMain = ctx.isRowDirection
        ? ctx.contentWidth - textMainOffset
        : ctx.contentHeight - textMainOffset;

      this.positionChildren(
        children,
        computedStyle,
        childContentX,
        childContentY,
        ctx.flexDirection,
        Math.max(0, childAvailableMain),
        ctx.isRowDirection ? ctx.contentHeight : ctx.contentWidth,
        ctx.mainGap,
      );
    }

    const totalWidth = ctx.outerWidth + ctx.horizontalMargin;
    const totalHeight = ctx.outerHeight + ctx.boxModel.marginTop + ctx.boxModel.marginBottom;

    return {
      element,
      x,
      y,
      width: totalWidth,
      height: totalHeight,
      contentX,
      contentY,
      contentWidth: ctx.contentWidth,
      contentHeight: ctx.contentHeight,
      computedStyle,
      textLines: textLines.length > 0 ? textLines : undefined,
      children,
      zIndex: ctx.zIndex,
    };
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
    const autoMarginCount = this.countMainAxisAutoMargins(orderedChildren, false);

    let startOffset: number;
    let betweenSpace: number;
    let perAutoMargin = 0;

    if (autoMarginCount > 0) {
      let totalChildSize = 0;

      for (let i = 0; i < orderedChildren.length; i += 1) {
        totalChildSize += orderedChildren[i]!.height;
      }

      const baseGapSpace = Math.max(0, orderedChildren.length - 1) * gap;
      const freeSpace = Math.max(0, availableMainSize - totalChildSize - baseGapSpace);

      perAutoMargin = Math.floor(freeSpace / autoMarginCount);
      startOffset = 0;
      betweenSpace = 0;
    } else {
      ({startOffset, betweenSpace} = this.resolveMainAxisSpacing(
        computedStyle,
        orderedChildren,
        availableMainSize,
        false,
        gap,
      ));
    }

    let cursorY = contentY + startOffset;

    for (let index = 0; index < orderedChildren.length; index += 1) {
      const child = orderedChildren[index]!;

      if (perAutoMargin > 0 && child.computedStyle.get('margin-top') === 'auto') {
        cursorY += perAutoMargin;
      }

      const childX =
        contentX + this.resolveCrossAxisOffset(child, computedStyle, availableCrossSize, true);

      this.offsetBox(child, childX, cursorY);
      cursorY += child.height;

      if (perAutoMargin > 0 && child.computedStyle.get('margin-bottom') === 'auto') {
        cursorY += perAutoMargin;
      }

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
    const autoMarginCount = this.countMainAxisAutoMargins(orderedChildren, true);

    let startOffset: number;
    let betweenSpace: number;
    let perAutoMargin = 0;

    if (autoMarginCount > 0) {
      let totalChildSize = 0;

      for (let i = 0; i < orderedChildren.length; i += 1) {
        totalChildSize += orderedChildren[i]!.width;
      }

      const baseGapSpace = Math.max(0, orderedChildren.length - 1) * gap;
      const freeSpace = Math.max(0, availableMainSize - totalChildSize - baseGapSpace);

      perAutoMargin = Math.floor(freeSpace / autoMarginCount);
      startOffset = 0;
      betweenSpace = 0;
    } else {
      ({startOffset, betweenSpace} = this.resolveMainAxisSpacing(
        computedStyle,
        orderedChildren,
        availableMainSize,
        true,
        gap,
      ));
    }

    let cursorX = contentX + startOffset;

    for (let index = 0; index < orderedChildren.length; index += 1) {
      const child = orderedChildren[index]!;

      if (perAutoMargin > 0 && child.computedStyle.get('margin-left') === 'auto') {
        cursorX += perAutoMargin;
      }

      const childY =
        contentY + this.resolveCrossAxisOffset(child, computedStyle, availableCrossSize, false);

      this.offsetBox(child, cursorX, childY);
      cursorX += child.width;

      if (perAutoMargin > 0 && child.computedStyle.get('margin-right') === 'auto') {
        cursorX += perAutoMargin;
      }

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
    let totalChildrenSize = 0;

    for (let i = 0; i < children.length; i += 1) {
      totalChildrenSize += this.getMainSize(children[i]!, isRowDirection);
    }
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
   *
   * Cross-axis auto margins take priority over alignment. When both cross-axis
   * margins are auto the child is centered; when only one is auto the child is
   * pushed to the opposite edge.
   */
  private resolveCrossAxisOffset(
    child: LayoutBox,
    computedStyle: ComputedStyle,
    availableCrossSize: number,
    isColumnDirection: boolean,
  ): number {
    const crossStartProp = isColumnDirection ? 'margin-left' : 'margin-top';
    const crossEndProp = isColumnDirection ? 'margin-right' : 'margin-bottom';
    const hasAutoStart = child.computedStyle.get(crossStartProp) === 'auto';
    const hasAutoEnd = child.computedStyle.get(crossEndProp) === 'auto';

    if (hasAutoStart || hasAutoEnd) {
      const childCrossSize = this.getCrossSize(child, !isColumnDirection);
      const freeSpace = Math.max(0, availableCrossSize - childCrossSize);

      if (hasAutoStart && hasAutoEnd) {
        return Math.floor(freeSpace / 2);
      }

      return hasAutoStart ? freeSpace : 0;
    }

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
   * Single-pass grow distribution for the common case where no children have
   * min/max constraints. Avoids the overhead of constraint scanning, array
   * filtering, and redundant clamping.
   */
  private distributeGrowFast(
    states: Array<{baseSize: number; grow: number; targetSize: number}>,
    freeSpace: number,
    totalGrow: number,
    originalGrowSum: number,
  ): void {
    const intendedTotal = Math.round((freeSpace * originalGrowSum) / totalGrow);
    let remainder = intendedTotal;
    let lastGrowIdx = -1;

    for (let i = states.length - 1; i >= 0; i -= 1) {
      if (states[i]!.grow > 0) {
        lastGrowIdx = i;
        break;
      }
    }

    for (let i = 0; i < states.length; i += 1) {
      const s = states[i]!;

      if (s.grow === 0) {
        continue;
      }

      const extra = i === lastGrowIdx ? remainder : Math.round((freeSpace * s.grow) / totalGrow);

      s.targetSize = s.baseSize + extra;
      remainder -= extra;
    }
  }

  /**
   * Two-pass grow distribution for children with min/max constraints.
   * Pass 1 freezes constrained items. Pass 2 redistributes remaining space
   * to unfrozen items using pre-parsed min/max values.
   */
  private distributeGrowConstrained(
    states: Array<{
      baseSize: number;
      grow: number;
      min: number | null;
      max: number | null;
      targetSize: number;
      frozen: boolean;
    }>,
    freeSpace: number,
    totalGrow: number,
  ): void {
    let frozenDelta = 0;
    let remainingGrow = totalGrow;

    for (const s of states) {
      if (s.grow === 0) {
        continue;
      }

      const proposed = s.baseSize + (freeSpace * s.grow) / totalGrow;
      const clamped = this.clampSize(proposed, s.min, s.max);

      if (clamped !== proposed) {
        s.targetSize = clamped;
        s.frozen = true;
        frozenDelta += clamped - s.baseSize;
        remainingGrow -= s.grow;
      }
    }

    const remainingFreeSpace = freeSpace - frozenDelta;

    if (remainingGrow > 0 && remainingFreeSpace > 0) {
      let unfrozenGrowSum = 0;
      let lastUnfrozen = -1;

      for (let i = 0; i < states.length; i += 1) {
        const s = states[i]!;

        if (!s.frozen && s.grow > 0) {
          unfrozenGrowSum += s.grow;
          lastUnfrozen = i;
        }
      }

      const intendedTotal = Math.round((remainingFreeSpace * unfrozenGrowSum) / remainingGrow);
      let remainder = intendedTotal;

      for (let i = 0; i < states.length; i += 1) {
        const s = states[i]!;

        if (s.frozen || s.grow === 0) {
          continue;
        }

        const extra =
          i === lastUnfrozen
            ? remainder
            : Math.round((remainingFreeSpace * s.grow) / remainingGrow);

        s.targetSize = s.baseSize + extra;
        remainder -= extra;
      }
    }

    for (const s of states) {
      if (!s.frozen) {
        s.targetSize = this.clampSize(s.targetSize, s.min, s.max);
      }
    }
  }

  /**
   * Single-pass shrink distribution for the common case where no children have
   * min/max constraints.
   */
  private distributeShrinkFast(
    states: Array<{baseSize: number; shrink: number; targetSize: number}>,
    freeSpace: number,
    totalShrinkWeight: number,
    originalShrinkWeight: number,
  ): void {
    const intendedReduction = Math.round((-freeSpace * originalShrinkWeight) / totalShrinkWeight);
    let remainingOverflow = intendedReduction;
    let lastShrinkIdx = -1;

    for (let i = states.length - 1; i >= 0; i -= 1) {
      const s = states[i]!;

      if (s.shrink * s.baseSize > 0) {
        lastShrinkIdx = i;
        break;
      }
    }

    for (let i = 0; i < states.length; i += 1) {
      const s = states[i]!;
      const weight = s.shrink * s.baseSize;

      if (weight === 0) {
        continue;
      }

      const reduction =
        i === lastShrinkIdx
          ? remainingOverflow
          : Math.round((-freeSpace * weight) / totalShrinkWeight);

      s.targetSize = Math.max(0, s.baseSize - reduction);
      remainingOverflow -= reduction;
    }
  }

  /**
   * Two-pass shrink distribution for children with min/max constraints.
   * Pass 1 freezes constrained items. Pass 2 redistributes remaining overflow
   * to unfrozen items using pre-parsed min/max values.
   */
  private distributeShrinkConstrained(
    states: Array<{
      baseSize: number;
      shrink: number;
      min: number | null;
      max: number | null;
      targetSize: number;
      frozen: boolean;
    }>,
    freeSpace: number,
    totalShrinkWeight: number,
  ): void {
    let frozenDelta = 0;
    let remainingShrinkWeight = totalShrinkWeight;

    for (const s of states) {
      const weight = s.shrink * s.baseSize;

      if (weight === 0) {
        continue;
      }

      const proposed = s.baseSize + (freeSpace * weight) / totalShrinkWeight;
      const clamped = this.clampSize(proposed, s.min, s.max);

      if (clamped !== proposed) {
        s.targetSize = clamped;
        s.frozen = true;
        frozenDelta += clamped - s.baseSize;
        remainingShrinkWeight -= weight;
      }
    }

    const remainingFreeSpace = freeSpace - frozenDelta;

    if (remainingShrinkWeight > 0 && remainingFreeSpace < 0) {
      let unfrozenWeightSum = 0;
      let lastUnfrozen = -1;

      for (let i = 0; i < states.length; i += 1) {
        const s = states[i]!;
        const weight = s.shrink * s.baseSize;

        if (!s.frozen && weight > 0) {
          unfrozenWeightSum += weight;
          lastUnfrozen = i;
        }
      }

      const intendedReduction = Math.round(
        (-remainingFreeSpace * unfrozenWeightSum) / remainingShrinkWeight,
      );
      let remainingOverflow = intendedReduction;

      for (let i = 0; i < states.length; i += 1) {
        const s = states[i]!;
        const weight = s.shrink * s.baseSize;

        if (s.frozen || weight === 0) {
          continue;
        }

        const reduction =
          i === lastUnfrozen
            ? remainingOverflow
            : Math.round((-remainingFreeSpace * weight) / remainingShrinkWeight);

        s.targetSize = Math.max(0, s.baseSize - reduction);
        remainingOverflow -= reduction;
      }
    }

    for (const s of states) {
      if (!s.frozen) {
        s.targetSize = this.clampSize(s.targetSize, s.min, s.max);
      }
    }
  }

  /**
   * Resolves a child's flex base size on the current main axis.
   *
   * When flex-basis is `auto`, the result is the child's existing main-axis
   * dimension which already includes padding + border — no floor is needed.
   * For explicit basis values the result is floored to the child's main-axis
   * padding + border so the flex basis never collapses below the box-model
   * insets (matches Yoga).
   */
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
   * Computes the main-axis padding + border for a child element.
   *
   * Used to floor flex-basis so it never collapses below the box-model insets.
   */
  private mainAxisPaddingAndBorder(computedStyle: ComputedStyle, isRowDirection: boolean): number {
    const borderStyle = computedStyle.get('border-style');
    const hasBorder = borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== '';
    const borderWidth = hasBorder ? 1 : 0;

    if (isRowDirection) {
      return (
        borderWidth +
        this.parseCellValue(computedStyle.get('padding-left')) +
        this.parseCellValue(computedStyle.get('padding-right')) +
        borderWidth
      );
    }

    return (
      borderWidth +
      this.parseCellValue(computedStyle.get('padding-top')) +
      this.parseCellValue(computedStyle.get('padding-bottom')) +
      borderWidth
    );
  }

  /**
   * Counts the total number of auto margins along the main axis across all
   * children. Each child can contribute 0, 1, or 2 auto margins.
   */
  private countMainAxisAutoMargins(children: LayoutBox[], isRowDirection: boolean): number {
    let count = 0;
    const startProp = isRowDirection ? 'margin-left' : 'margin-top';
    const endProp = isRowDirection ? 'margin-right' : 'margin-bottom';

    for (const child of children) {
      if (child.computedStyle.get(startProp) === 'auto') {
        count += 1;
      }

      if (child.computedStyle.get(endProp) === 'auto') {
        count += 1;
      }
    }

    return count;
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
   * Sets a layout box size on the main axis without min/max clamping,
   * preserving its box-model insets. Used by the compatibility bridge.
   */
  private setMainSizeUnclamped(box: LayoutBox, isRowDirection: boolean, size: number): void {
    if (isRowDirection) {
      const horizontalInset = box.width - box.contentWidth;

      box.width = size;
      box.contentWidth = Math.max(0, size - horizontalInset);
      return;
    }

    const verticalInset = box.height - box.contentHeight;

    box.height = size;
    box.contentHeight = Math.max(0, size - verticalInset);
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
   * Resolves intrinsic content width from {@link FlexChildBasis} values
   * (used by {@link computeSizes} for shrink-wrap containers).
   */
  private resolveIntrinsicContentWidthFromBases(
    childBases: FlexChildBasis[],
    textLines: string[],
    isRowDirection: boolean,
    computedStyle: ComputedStyle,
  ): number {
    const textWidth = this.maxTextWidth(textLines);

    if (childBases.length === 0) {
      return textWidth;
    }

    if (isRowDirection) {
      const gap = this.parseCellValue(computedStyle.get('column-gap'));
      let total = 0;

      for (const basis of childBases) {
        total += basis.intrinsicMainSize;
      }

      return Math.max(textWidth, total + Math.max(0, childBases.length - 1) * gap);
    }

    let maxCross = 0;

    for (const basis of childBases) {
      if (basis.intrinsicCrossSize > maxCross) {
        maxCross = basis.intrinsicCrossSize;
      }
    }

    return Math.max(textWidth, maxCross);
  }

  /**
   * Resolves flex basis from a {@link FlexChildBasis}.
   */
  private resolveFlexBasisFromBasis(basis: FlexChildBasis, isRowDirection: boolean): number {
    const basisValue = basis.computedStyle.get('flex-basis');

    if (basisValue === undefined || basisValue === '' || basisValue === 'auto') {
      return basis.intrinsicMainSize;
    }

    const parsed = this.parseDimension(basisValue);

    if (parsed === null) {
      return basis.intrinsicMainSize;
    }

    const paddingAndBorder = this.mainAxisPaddingAndBorder(basis.computedStyle, isRowDirection);

    return Math.max(parsed, paddingAndBorder);
  }

  /**
   * Builds wrapped line indices from flex basis sizes.
   */
  private buildWrapLinesFromBases(
    baseSizes: number[],
    availableWidth: number,
    gap: number,
  ): number[][] {
    const lines: number[][] = [];
    let currentLine: number[] = [];
    let currentWidth = 0;

    for (let i = 0; i < baseSizes.length; i += 1) {
      const childWidth = baseSizes[i]!;
      const nextWidth = currentLine.length === 0 ? childWidth : currentWidth + gap + childWidth;

      if (currentLine.length > 0 && nextWidth > availableWidth) {
        lines.push(currentLine);
        currentLine = [i];
        currentWidth = childWidth;
      } else {
        currentLine.push(i);
        currentWidth = nextWidth;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Applies flex sizing on a subset of children identified by indices.
   * Writes resolved main sizes into the `resolvedMainSizes` array.
   */
  private applyFlexSizingOnIndices(
    childBases: FlexChildBasis[],
    resolvedMainSizes: number[],
    indices: number[],
    isRowDirection: boolean,
    availableMainSize: number,
  ): void {
    if (indices.length === 0) {
      return;
    }

    const minProp = isRowDirection ? 'min-width' : 'min-height';
    const maxProp = isRowDirection ? 'max-width' : 'max-height';

    let hasConstraints = false;
    let totalBaseSize = 0;
    let totalGrow = 0;

    const states: Array<{
      idx: number;
      baseSize: number;
      grow: number;
      shrink: number;
      min: number | null;
      max: number | null;
      targetSize: number;
      frozen: boolean;
    }> = new Array(indices.length);

    for (let i = 0; i < indices.length; i += 1) {
      const idx = indices[i]!;
      const basis = childBases[idx]!;
      const baseSize = resolvedMainSizes[idx]!;
      const grow = this.parseFlexFactor(basis.computedStyle.get('flex-grow'), 0);
      const shrink = this.parseFlexFactor(basis.computedStyle.get('flex-shrink'), 1);
      const min = this.parseDimension(basis.computedStyle.get(minProp));
      const max = this.parseDimension(basis.computedStyle.get(maxProp));

      if (min !== null || max !== null) {
        hasConstraints = true;
      }

      totalBaseSize += baseSize;
      totalGrow += grow;

      states[i] = {idx, baseSize, grow, shrink, min, max, targetSize: baseSize, frozen: false};
    }

    const freeSpace = availableMainSize - totalBaseSize;

    if (freeSpace > 0) {
      const originalGrowSum = totalGrow;

      if (totalGrow > 0 && totalGrow < 1) {
        totalGrow = 1;
      }

      if (totalGrow > 0) {
        if (hasConstraints) {
          this.distributeGrowConstrained(states, freeSpace, totalGrow);
        } else {
          this.distributeGrowFast(states, freeSpace, totalGrow, originalGrowSum);
        }
      }
    } else if (freeSpace < 0) {
      let totalShrinkWeight = 0;

      for (const s of states) {
        totalShrinkWeight += s.shrink * s.baseSize;
      }

      const originalShrinkWeight = totalShrinkWeight;

      if (totalShrinkWeight > 0 && totalShrinkWeight < 1) {
        totalShrinkWeight = 1;
      }

      if (totalShrinkWeight > 0) {
        if (hasConstraints) {
          this.distributeShrinkConstrained(states, freeSpace, totalShrinkWeight);
        } else {
          this.distributeShrinkFast(states, freeSpace, totalShrinkWeight, originalShrinkWeight);
        }
      }
    }

    // Write resolved sizes back
    for (const s of states) {
      const min = s.min;
      const max = s.max;

      resolvedMainSizes[s.idx] =
        min !== null || max !== null ? this.clampSize(s.targetSize, min, max) : s.targetSize;
    }
  }

  /**
   * Finds the cross size of the flex line containing the given child index.
   */
  private findLineCrossSize(
    childIndex: number,
    lineChildIndices: number[][],
    lineCrossSizes: number[],
  ): number {
    for (let i = 0; i < lineChildIndices.length; i += 1) {
      const line = lineChildIndices[i]!;

      for (const idx of line) {
        if (idx === childIndex) {
          return lineCrossSizes[i]!;
        }
      }
    }

    return 0;
  }

  /**
   * Sets a layout box's cross-axis size without min/max clamping.
   */
  private setCrossSizeUnclamped(box: LayoutBox, isRowDirection: boolean, size: number): void {
    if (isRowDirection) {
      const verticalInset = box.height - box.contentHeight;

      box.height = size;
      box.contentHeight = Math.max(0, size - verticalInset);
      return;
    }

    const horizontalInset = box.width - box.contentWidth;

    box.width = size;
    box.contentWidth = Math.max(0, size - horizontalInset);
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
