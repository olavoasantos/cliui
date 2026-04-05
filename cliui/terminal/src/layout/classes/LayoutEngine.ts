import {CHILD, NEXT, NodeType} from '@cliui/dom';
import {FlexLayout} from './FlexLayout';
import {TextLayout} from './TextLayout';
import {layoutPreparedText} from '../utilities/layoutPreparedText';
import {prepareText} from '../utilities/prepareText';

import type {PreparedText} from '../types/PreparedText';

import type {Node} from '@cliui/dom';
import type {Element} from '@cliui/dom';
import type {CharacterData} from '@cliui/dom';
import type {StyleEngine} from '../../css/classes/StyleEngine';
import type {ComputedStyle} from '../../css/types';
import type {LayoutBox, TextLayoutOptions} from '../types';
import type {FlexChildBasis} from '../types/FlexChildBasis';

/**
 * Top-level layout engine that takes a DOM tree and computed styles, runs
 * layout from the root element, and produces a nested tree of {@link LayoutBox}
 * objects.
 *
 * The root available space is defined by terminal dimensions (columns x rows).
 * Percentage values are resolved relative to the parent content area, and
 * `auto` values default to available width for width and content height for
 * height. Supports incremental re-layout by consuming layout-dirty marks from
 * the {@link StyleEngine}.
 */
export class LayoutEngine {
  private readonly styleEngine: StyleEngine;
  private readonly flexLayout = new FlexLayout();
  private readonly textLayout = new TextLayout();
  private cache = new WeakMap<Element, LayoutBox>();
  private textCache = new Map<string, PreparedText>();
  private viewportColumns = 0;
  private viewportRows = 0;

  /** Guard against recursive container query re-evaluation. */
  private containerLayoutInProgress = new WeakSet<Element>();

  /**
   * Creates a new layout engine backed by the given style engine.
   *
   * @param styleEngine - The style engine used to retrieve computed styles
   *   for each element in the DOM tree.
   */
  constructor(styleEngine: StyleEngine) {
    this.styleEngine = styleEngine;
  }

  /**
   * Performs a full layout pass starting from the given root element.
   *
   * Traverses the DOM tree recursively, computing a {@link LayoutBox} for
   * every element. Text nodes are measured and wrapped using {@link TextLayout}.
   * Child elements are positioned using column flex layout via
   * {@link FlexLayout}.
   *
   * @param root - The root DOM element to lay out (typically `document.body`).
   * @param columns - The available terminal width in cells.
   * @param rows - The available terminal height in cells.
   * @returns A fully positioned {@link LayoutBox} tree.
   */
  layout(root: Element, columns: number, rows: number): LayoutBox {
    this.viewportColumns = columns;
    this.viewportRows = rows;

    const dirtySet = this.styleEngine.getLayoutDirtyElements();

    if (dirtySet.size > 0) {
      this.clearCache();
    }

    const box = this.layoutElement(root, columns, rows, 0, 0, false, dirtySet);

    if (dirtySet.size > 0) {
      this.styleEngine.clearLayoutDirty();
    }

    return box;
  }

  /**
   * Clears the cached layout box tree, forcing a full re-layout on the next
   * {@link layout} call.
   */
  clearCache(): void {
    this.cache = new WeakMap<Element, LayoutBox>();
  }

  /**
   * Recursively lays out a single element and its children.
   *
   * When performing incremental layout, clean subtrees reuse their cached
   * {@link LayoutBox}. Dirty elements and their descendants are re-laid out.
   */
  private layoutElement(
    element: Element,
    availableWidth: number,
    availableHeight: number,
    x: number,
    y: number,
    incremental: boolean,
    dirtySet: ReadonlySet<Element>,
  ): LayoutBox {
    // For incremental layout, reuse cached boxes for clean subtrees
    if (incremental && !this.isSubtreeDirty(element, dirtySet)) {
      const cached = this.cache.get(element);

      if (cached) {
        return this.cloneWithFreshStyles(cached);
      }
    }

    const computedStyle = this.styleEngine.getComputedStyle(element);

    // Skip hidden elements
    const display = computedStyle.get('display');

    if (display === 'none') {
      const emptyBox: LayoutBox = {
        element,
        x,
        y,
        width: 0,
        height: 0,
        contentX: x,
        contentY: y,
        contentWidth: 0,
        contentHeight: 0,
        computedStyle,
        children: [],
        zIndex: 0,
      };

      this.cache.set(element, emptyBox);

      return emptyBox;
    }

    // Resolve percentage values in the computed style relative to parent
    const resolvedStyle = this.normalizeDisplay(
      this.resolvePercentages(computedStyle, availableWidth, availableHeight),
    );

    // Collect text lines and child elements
    const textLines: string[] = [];
    const allChildElements: Element[] = [];

    this.collectChildren(element, allChildElements, textLines);

    // Determine content dimensions for text measurement and percentage resolution
    const contentWidth = this.estimateContentWidth(resolvedStyle, availableWidth);
    const contentHeight = this.estimateContentHeight(resolvedStyle, availableHeight);

    // Measure text if present
    const measuredTextLines: string[] = [];

    const textOptions: TextLayoutOptions = {
      whiteSpace:
        (resolvedStyle.get('white-space') as TextLayoutOptions['whiteSpace'] | undefined) ??
        'normal',
      textOverflow:
        (resolvedStyle.get('text-overflow') as TextLayoutOptions['textOverflow'] | undefined) ??
        'clip',
      overflowWrap:
        (resolvedStyle.get('overflow-wrap') as TextLayoutOptions['overflowWrap'] | undefined) ??
        'break-word',
      wordBreak:
        (resolvedStyle.get('word-break') as TextLayoutOptions['wordBreak'] | undefined) ?? 'normal',
      tabSize: Number.parseInt(resolvedStyle.get('tab-size') ?? '8', 10) || 8,
    };

    for (const text of textLines) {
      // Split on hard breaks injected by <br> elements
      const segments = text.includes('\n') ? text.split('\n') : [text];

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx]!;

        // Empty segment from consecutive <br> or leading/trailing <br>: emit a blank line
        if (segment.length === 0) {
          // Always emit blank line for <br> breaks (segIdx > 0 means after a \n split)
          // Also emit for leading <br> when there was preceding text in measuredTextLines
          if (segIdx > 0 || measuredTextLines.length > 0) {
            measuredTextLines.push('');
          } else if (segments.length > 1) {
            // Leading <br> before any content — emit a blank first line
            measuredTextLines.push('');
          }

          continue;
        }

        const whiteSpaceMode = textOptions.whiteSpace ?? 'normal';
        const canBreakWords = (textOptions.overflowWrap ?? 'break-word') === 'break-word';
        let measured;

        if (whiteSpaceMode === 'normal') {
          let prepared = this.textCache.get(segment);

          if (!prepared) {
            prepared = prepareText(segment) ?? undefined;

            if (prepared) {
              this.textCache.set(segment, prepared);
            }
          }

          measured = prepared ? layoutPreparedText(prepared, contentWidth, canBreakWords) : [];
        } else {
          measured = this.textLayout.measure(segment, contentWidth, textOptions);
        }

        for (const line of measured) {
          if (line.text.length > 0 || measured.length === 1) {
            measuredTextLines.push(line.text);
          }
        }
      }
    }

    // --- Two-phase layout ---

    const flexDirection = resolvedStyle.get('flex-direction') ?? 'column';
    const isRowDirection = flexDirection === 'row' || flexDirection === 'row-reverse';

    // Collect text and child elements
    const childElements = allChildElements;
    const inFlowElements: Element[] = [];
    const absoluteElements: Element[] = [];

    const intrinsicBoxes: Array<LayoutBox | null> = new Array(childElements.length);
    const childBases: FlexChildBasis[] = [];
    const inFlowIndices: number[] = [];
    const absoluteIndices: number[] = [];

    for (let i = 0; i < childElements.length; i += 1) {
      const child = childElements[i]!;
      const childStyle = this.styleEngine.getComputedStyle(child);

      if (childStyle.get('display') === 'none') {
        intrinsicBoxes[i] = null;
        continue;
      }

      const intrinsicBox = this.layoutElement(
        child,
        contentWidth,
        contentHeight,
        0,
        0,
        incremental,
        dirtySet,
      );

      intrinsicBoxes[i] = intrinsicBox;

      if (childStyle.get('position') === 'absolute') {
        absoluteIndices.push(i);
        absoluteElements.push(child);
      } else {
        inFlowIndices.push(i);
        inFlowElements.push(child);

        childBases.push({
          intrinsicMainSize: isRowDirection ? intrinsicBox.width : intrinsicBox.height,
          intrinsicCrossSize: isRowDirection ? intrinsicBox.height : intrinsicBox.width,
          computedStyle: intrinsicBox.computedStyle,
        });
      }
    }

    // Compute resolved flex sizes
    const sizing = this.flexLayout.computeSizes(
      element,
      resolvedStyle,
      childBases,
      measuredTextLines,
      availableWidth,
      availableHeight,
    );

    // Phase 2: Layout each in-flow child at its resolved dimensions.
    // Skip re-layout when the resolved dimensions match the intrinsic ones.
    const inFlowChildren: LayoutBox[] = new Array(inFlowElements.length);

    for (let i = 0; i < inFlowElements.length; i += 1) {
      const resolved = sizing.resolvedChildren[i]!;
      const childIdx = inFlowIndices[i]!;
      const intrinsicBox = intrinsicBoxes[childIdx]!;
      const resolvedWidth = isRowDirection ? resolved.mainSize : resolved.crossSize;
      const resolvedHeight = isRowDirection ? resolved.crossSize : resolved.mainSize;

      if (resolvedWidth === intrinsicBox.width && resolvedHeight === intrinsicBox.height) {
        // Dimensions match — reuse the intrinsic layout
        inFlowChildren[i] = intrinsicBox;
      } else {
        // Dimensions changed by flex — re-layout at the resolved size
        inFlowChildren[i] = this.layoutElement(
          inFlowElements[i]!,
          resolvedWidth,
          resolvedHeight,
          0,
          0,
          incremental,
          dirtySet,
        );
      }
    }

    // Force resolved dimensions on children. A child's own layoutElement
    // produces content-based dimensions, but flex grow/shrink/stretch at
    // THIS level determines the final size. Without this, a flex-grown
    // empty child would stay at height 0 instead of filling its slot.
    for (let i = 0; i < inFlowChildren.length; i += 1) {
      const resolved = sizing.resolvedChildren[i]!;
      const child = inFlowChildren[i]!;
      const resolvedW = isRowDirection ? resolved.mainSize : resolved.crossSize;
      const resolvedH = isRowDirection ? resolved.crossSize : resolved.mainSize;

      if (child.width !== resolvedW) {
        const inset = child.width - child.contentWidth;

        child.width = resolvedW;
        child.contentWidth = Math.max(0, resolvedW - inset);
      }

      if (child.height !== resolvedH) {
        const inset = child.height - child.contentHeight;

        child.height = resolvedH;
        child.contentHeight = Math.max(0, resolvedH - inset);
      }
    }

    // Position children
    const box = this.flexLayout.position(
      element,
      resolvedStyle,
      inFlowChildren,
      measuredTextLines,
      sizing.context,
      x,
      y,
    );

    // Build final child order (in-flow + absolute, in DOM order)
    const absoluteChildren: LayoutBox[] = [];
    const childOrder: LayoutBox[] = [];
    let inFlowCursor = 0;
    let absoluteCursor = 0;

    for (let i = 0; i < childElements.length; i += 1) {
      if (intrinsicBoxes[i] === null) {
        continue;
      }

      if (absoluteCursor < absoluteIndices.length && absoluteIndices[absoluteCursor] === i) {
        absoluteChildren.push(intrinsicBoxes[i]!);
        childOrder.push(intrinsicBoxes[i]!);
        absoluteCursor += 1;
      } else if (inFlowCursor < inFlowIndices.length && inFlowIndices[inFlowCursor] === i) {
        childOrder.push(inFlowChildren[inFlowCursor]!);
        inFlowCursor += 1;
      }
    }

    for (const absoluteChild of absoluteChildren) {
      this.positionAbsoluteChild(
        absoluteChild,
        box.contentX,
        box.contentY,
        box.contentWidth,
        box.contentHeight,
        resolvedStyle,
      );
    }

    box.children = childOrder;
    this.applyScrollState(element, box, measuredTextLines.length);

    // After scroll is applied, reposition modal dialogs to viewport center.
    for (const absoluteChild of absoluteChildren) {
      if (
        absoluteChild.element.localName === 'dialog' &&
        absoluteChild.element.hasAttribute('modal')
      ) {
        this.centerInViewport(absoluteChild);
      }
    }

    this.cache.set(element, box);

    // Container query two-pass resolution:
    // If this element is a container and its size was just determined,
    // evaluate @container conditions. If matches changed, re-compute
    // children's styles and re-layout the entire subtree.
    if (
      this.styleEngine.isContainerElement(element) &&
      !this.containerLayoutInProgress.has(element)
    ) {
      const sizeChanged = this.styleEngine.setContainerSize(element, {
        width: box.contentWidth,
        height: box.contentHeight,
      });

      if (sizeChanged) {
        // Guard against infinite recursion
        this.containerLayoutInProgress.add(element);

        // Invalidate style cache for descendants
        this.styleEngine.invalidateSubtree(element);

        // Re-layout this element — children will now pick up
        // container-query-matched rules via getComputedStyle
        this.cache.delete(element);
        const relaid = this.layoutElement(
          element,
          availableWidth,
          availableHeight,
          x,
          y,
          incremental,
          dirtySet,
        );

        this.containerLayoutInProgress.delete(element);

        // Return the re-laid box instead
        return relaid;
      }
    }

    return box;
  }

  /**
   * Applies persistent scroll state for `overflow: scroll` boxes.
   */
  private applyScrollState(element: Element, box: LayoutBox, textLineCount: number): void {
    if (box.computedStyle.get('overflow') !== 'scroll') {
      return;
    }

    const scrollHeight = this.computeScrollHeight(box, textLineCount);
    const maxScrollOffset = Math.max(0, scrollHeight - box.contentHeight);
    const elementWithScroll = element as Element & {scrollTop?: number};
    const rawScrollOffset = elementWithScroll.scrollTop ?? 0;
    const scrollOffsetY = Math.max(0, Math.min(maxScrollOffset, rawScrollOffset));

    elementWithScroll.scrollTop = scrollOffsetY;
    box.scrollHeight = scrollHeight;
    box.scrollOffsetY = scrollOffsetY;

    if (scrollOffsetY === 0) {
      return;
    }

    for (const child of box.children) {
      this.offsetBox(child, 0, -scrollOffsetY);
    }
  }

  /**
   * Computes the full scrollable content height of a box.
   */
  private computeScrollHeight(box: LayoutBox, textLineCount: number): number {
    let maxBottom = textLineCount;

    for (const child of box.children) {
      maxBottom = Math.max(maxBottom, child.y + child.height - box.contentY);
    }

    return Math.max(0, maxBottom);
  }

  /**
   * Positions an absolutely positioned child relative to the containing box's
   * content area. Supports `top`, `left`, `right`, and `bottom` insets.
   *
   * When both opposing insets are defined without an explicit dimension, the
   * child is resized to fill the remaining space (size-from-insets). When no
   * insets are defined the child defaults to the content area start.
   */
  private positionAbsoluteChild(
    box: LayoutBox,
    containingX: number,
    containingY: number,
    containingWidth: number,
    containingHeight: number,
    parentStyle: ComputedStyle,
  ): void {
    const leftVal = box.computedStyle.get('left');
    const rightVal = box.computedStyle.get('right');
    const topVal = box.computedStyle.get('top');
    const bottomVal = box.computedStyle.get('bottom');

    const hasLeft = this.isInsetDefined(leftVal);
    const hasRight = this.isInsetDefined(rightVal);
    const hasTop = this.isInsetDefined(topVal);
    const hasBottom = this.isInsetDefined(bottomVal);

    const hasExplicitWidth = this.isDimensionDefined(box.computedStyle.get('width'));
    const hasExplicitHeight = this.isDimensionDefined(box.computedStyle.get('height'));

    // Size from opposing insets
    if (hasLeft && hasRight && !hasExplicitWidth) {
      const l = this.parseSignedCellValue(leftVal);
      const r = this.parseSignedCellValue(rightVal);
      const derivedWidth = Math.max(0, containingWidth - l - r);
      const inset = box.width - box.contentWidth;

      box.width = derivedWidth;
      box.contentWidth = Math.max(0, derivedWidth - inset);
    }

    if (hasTop && hasBottom && !hasExplicitHeight) {
      const t = this.parseSignedCellValue(topVal);
      const b = this.parseSignedCellValue(bottomVal);
      const derivedHeight = Math.max(0, containingHeight - t - b);
      const inset = box.height - box.contentHeight;

      box.height = derivedHeight;
      box.contentHeight = Math.max(0, derivedHeight - inset);
    }

    // Horizontal positioning
    let dx: number;

    if (hasLeft) {
      dx = containingX + this.parseSignedCellValue(leftVal);
    } else if (hasRight) {
      dx = containingX + containingWidth - box.width - this.parseSignedCellValue(rightVal);
    } else {
      dx = containingX + this.resolveAbsoluteAxisOffset(box, parentStyle, containingWidth, true);
    }

    // Vertical positioning
    let dy: number;

    if (hasTop) {
      dy = containingY + this.parseSignedCellValue(topVal);
    } else if (hasBottom) {
      dy = containingY + containingHeight - box.height - this.parseSignedCellValue(bottomVal);
    } else {
      dy = containingY + this.resolveAbsoluteAxisOffset(box, parentStyle, containingHeight, false);
    }

    this.offsetBox(box, dx, dy);
  }

  /**
   * Resolves the offset for an absolutely positioned child along a given
   * physical axis when no insets are defined. Uses justify-content (main axis)
   * or align-items (cross axis) from the parent.
   */
  private resolveAbsoluteAxisOffset(
    child: LayoutBox,
    parentStyle: ComputedStyle,
    containerSize: number,
    isHorizontal: boolean,
  ): number {
    const flexDirection = parentStyle.get('flex-direction') ?? 'column';
    const isParentRow = flexDirection === 'row' || flexDirection === 'row-reverse';
    const isMainAxis = isHorizontal === isParentRow;
    const childSize = isHorizontal ? child.width : child.height;
    const freeSpace = Math.max(0, containerSize - childSize);

    if (isMainAxis) {
      const justify = parentStyle.get('justify-content') ?? 'flex-start';

      switch (justify) {
        case 'flex-end':
          return freeSpace;
        case 'center':
        case 'space-around':
        case 'space-evenly':
          return Math.floor(freeSpace / 2);
        default:
          return 0;
      }
    }

    const align = parentStyle.get('align-items') ?? 'flex-start';
    const childAlign = child.computedStyle.get('align-self');
    const effectiveAlign =
      childAlign !== undefined && childAlign !== '' && childAlign !== 'auto' ? childAlign : align;

    switch (effectiveAlign) {
      case 'flex-end':
        return freeSpace;
      case 'center':
        return Math.floor(freeSpace / 2);
      default:
        return 0;
    }
  }

  /**
   * Tests whether a CSS inset value (`top`, `left`, `right`, `bottom`) is
   * explicitly defined (not `auto`, empty, or absent).
   */
  private isInsetDefined(value: string | undefined): boolean {
    return value !== undefined && value !== '' && value !== 'auto';
  }

  /**
   * Tests whether a CSS dimension value (`width`, `height`) is explicitly
   * defined (not `auto`, empty, or absent).
   */
  private isDimensionDefined(value: string | undefined): boolean {
    return value !== undefined && value !== '' && value !== 'auto';
  }

  /**
   * Repositions a layout box to be centered in the terminal viewport.
   * Called after scroll offsets have been applied, so coordinates are
   * viewport-relative.
   *
   * The center position is cached per dialog element and only
   * recomputed when the viewport dimensions change. This prevents
   * layout shift when dialog content changes size.
   */
  private centerInViewport(box: LayoutBox): void {
    const element = box.element as Element & {
      __cachedCenter?: {centerX: number; centerY: number; vpCols: number; vpRows: number};
    };
    const cached = element.__cachedCenter;

    if (cached && cached.vpCols === this.viewportColumns && cached.vpRows === this.viewportRows) {
      this.offsetBox(box, cached.centerX - box.x, cached.centerY - box.y);
      return;
    }

    const centerX = Math.max(0, Math.floor((this.viewportColumns - box.width) / 2));
    const centerY = Math.max(0, Math.floor((this.viewportRows - box.height) / 2));

    element.__cachedCenter = {
      centerX,
      centerY,
      vpCols: this.viewportColumns,
      vpRows: this.viewportRows,
    };

    // Reset to origin then move to center
    this.offsetBox(box, centerX - box.x, centerY - box.y);
  }

  /**
   * Creates a deep clone of a cached box tree and normalizes it back to the
   * local `(0, 0)` coordinate space expected by parent layout passes.
   */
  /**
   * Clones a cached layout box subtree with fresh computedStyle references.
   *
   * The cached original is never mutated. Each clone gets the latest
   * ComputedStyle from the style engine, so non-layout property changes
   * (color, opacity, etc.) are visible to the painter.
   */
  private cloneWithFreshStyles(box: LayoutBox): LayoutBox {
    const cloneChildren = box.children.map((child) => this.cloneWithFreshStyles(child));
    const clone: LayoutBox = {
      ...box,
      computedStyle: this.styleEngine.getComputedStyle(box.element),
      textLines: box.textLines === undefined ? undefined : [...box.textLines],
      children: cloneChildren,
    };

    this.offsetBox(clone, -box.x, -box.y);
    return clone;
  }

  private cloneLocalizedBox(box: LayoutBox): LayoutBox {
    const cloneChildren = box.children.map((child) => this.cloneLocalizedBox(child));
    const clone: LayoutBox = {
      ...box,
      computedStyle: box.computedStyle,
      textLines: box.textLines === undefined ? undefined : [...box.textLines],
      children: cloneChildren,
    };

    this.offsetBox(clone, -box.x, -box.y);

    return clone;
  }

  /**
   * Recursively offsets a layout box subtree by the provided delta.
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

  /**
   * Collects direct child elements and text content from an element's children.
   *
   * Element children are added to `childElements`. Text node content is added
   * to `textLines`.
   */
  private collectChildren(element: Element, childElements: Element[], textLines: string[]): void {
    let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];
    let pendingText = '';

    while (child) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        const el = child as unknown as Element;
        const tag = el.localName;

        if (tag === 'br') {
          pendingText += '\n';
        } else if (tag === 'wbr') {
          pendingText += '\u200B';
        } else {
          if (pendingText.length > 0) {
            textLines.push(pendingText);
            pendingText = '';
          }

          childElements.push(el);
        }
      } else if (child.nodeType === NodeType.TEXT_NODE) {
        const text = (child as unknown as CharacterData).data;

        if (text.length > 0) {
          pendingText += text;
        }
      }

      child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
    }

    if (pendingText.length > 0) {
      textLines.push(pendingText);
    }
  }

  /**
   * Estimates the content width for an element before full layout, used for
   * text measurement. Accounts for explicit width, padding, margin, and border.
   */
  private estimateContentWidth(computedStyle: ComputedStyle, availableWidth: number): number {
    const boxSizing = computedStyle.get('box-sizing') ?? 'border-box';
    const explicitWidth = this.parseDimension(computedStyle.get('width'));

    const borderStyle = computedStyle.get('border-style');
    const hasBorder = borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== '';
    const borderWidth = hasBorder ? 1 : 0;

    const paddingLeft = this.parseCellValue(computedStyle.get('padding-left'));
    const paddingRight = this.parseCellValue(computedStyle.get('padding-right'));
    const marginLeft = this.parseCellValue(computedStyle.get('margin-left'));
    const marginRight = this.parseCellValue(computedStyle.get('margin-right'));

    const horizontalBorderPadding = borderWidth + paddingLeft + paddingRight + borderWidth;
    const horizontalMargin = marginLeft + marginRight;

    if (explicitWidth !== null) {
      if (boxSizing === 'border-box') {
        return Math.max(0, explicitWidth - horizontalBorderPadding);
      }

      return explicitWidth;
    }

    const outerWidth = availableWidth - horizontalMargin;

    return Math.max(0, outerWidth - horizontalBorderPadding);
  }

  /**
   * Estimates the content height for an element before full layout, used for
   * child percentage resolution. Accounts for explicit height, padding,
   * margin, and border.
   */
  private estimateContentHeight(computedStyle: ComputedStyle, availableHeight: number): number {
    const boxSizing = computedStyle.get('box-sizing') ?? 'border-box';
    const explicitHeight = this.parseDimension(computedStyle.get('height'));

    const borderStyle = computedStyle.get('border-style');
    const hasBorder = borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== '';
    const borderWidth = hasBorder ? 1 : 0;

    const paddingTop = this.parseCellValue(computedStyle.get('padding-top'));
    const paddingBottom = this.parseCellValue(computedStyle.get('padding-bottom'));
    const marginTop = this.parseCellValue(computedStyle.get('margin-top'));
    const marginBottom = this.parseCellValue(computedStyle.get('margin-bottom'));

    const verticalBorderPadding = borderWidth + paddingTop + paddingBottom + borderWidth;
    const verticalMargin = marginTop + marginBottom;

    if (explicitHeight !== null) {
      if (boxSizing === 'border-box') {
        return Math.max(0, explicitHeight - verticalBorderPadding);
      }

      return explicitHeight;
    }

    const outerHeight = availableHeight - verticalMargin;

    return Math.max(0, outerHeight - verticalBorderPadding);
  }

  /**
   * Normalizes display shorthands used by the architecture.
   */
  private normalizeDisplay(computedStyle: ComputedStyle): ComputedStyle {
    const display = computedStyle.get('display');

    if (display !== 'inline') {
      return computedStyle;
    }

    const normalized = new Map(computedStyle);

    if (!normalized.has('flex-direction')) {
      normalized.set('flex-direction', 'row');
    }

    if (!normalized.has('flex-wrap')) {
      normalized.set('flex-wrap', 'wrap');
    }

    return normalized;
  }

  /**
   * Resolves percentage values in a computed style relative to the parent
   * content area dimensions. Percentages for width-related properties resolve
   * against `availableWidth`, and height-related properties resolve against
   * `availableHeight`.
   */
  private resolvePercentages(
    computedStyle: ComputedStyle,
    availableWidth: number,
    availableHeight: number,
  ): ComputedStyle {
    let resolved: ComputedStyle | null = null;

    for (const [prop, value] of computedStyle) {
      if (value.endsWith('%')) {
        const numericValue = parseFloat(value);

        if (!Number.isNaN(numericValue)) {
          if (resolved === null) {
            resolved = new Map(computedStyle);
          }

          const base = this.isHeightProperty(prop) ? availableHeight : availableWidth;
          const resolvedValue = Math.round((numericValue / 100) * base);

          resolved.set(prop, String(resolvedValue));
        }
      }
    }

    return resolved ?? computedStyle;
  }

  /**
   * Determines whether a CSS property is height-related for percentage
   * resolution purposes.
   */
  private isHeightProperty(property: string): boolean {
    return (
      property === 'height' ||
      property === 'min-height' ||
      property === 'max-height' ||
      property === 'padding-top' ||
      property === 'padding-bottom' ||
      property === 'margin-top' ||
      property === 'margin-bottom' ||
      property === 'top' ||
      property === 'bottom'
    );
  }

  /**
   * Checks whether an element or any of its descendants are in the dirty set.
   */
  private isSubtreeDirty(element: Element, dirtySet: ReadonlySet<Element>): boolean {
    if (dirtySet.has(element)) {
      return true;
    }

    let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];

    while (child) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        if (this.isSubtreeDirty(child as unknown as Element, dirtySet)) {
          return true;
        }
      }

      child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
    }

    return false;
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
   * Like parseCellValue but allows negative values (used for position offsets).
   */
  private parseSignedCellValue(value: string | undefined): number {
    if (value === undefined || value === '' || value === 'auto') {
      return 0;
    }

    const parsed = parseInt(value, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
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
}
