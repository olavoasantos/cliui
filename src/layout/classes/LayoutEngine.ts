import {CHILD, NEXT, NodeType} from '../../dom/constants/index';
import {FlexLayout} from './FlexLayout';
import {TextLayout} from './TextLayout';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';
import type {CharacterData} from '../../dom/classes/CharacterData';
import type {StyleEngine} from '../../css/classes/StyleEngine';
import type {ComputedStyle} from '../../css/types/index';
import type {LayoutBox} from '../types/index';

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
    const dirtySet = this.styleEngine.getLayoutDirtyElements();
    const isIncremental = dirtySet.size > 0;
    const box = this.layoutElement(root, columns, rows, 0, 0, isIncremental, dirtySet);

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
        return cached;
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
    const resolvedStyle = this.resolvePercentages(computedStyle, availableWidth, availableHeight);

    // Collect text lines and child elements
    const textLines: string[] = [];
    const childElements: Element[] = [];

    this.collectChildren(element, childElements, textLines);

    // Determine content width for text measurement (need to pre-compute)
    const contentWidth = this.estimateContentWidth(resolvedStyle, availableWidth);

    // Measure text if present
    const measuredTextLines: string[] = [];

    for (const text of textLines) {
      const measured = this.textLayout.measure(text, contentWidth);

      for (const line of measured) {
        if (line.text.length > 0 || measured.length === 1) {
          measuredTextLines.push(line.text);
        }
      }
    }

    // Layout child elements recursively
    const childBoxes: LayoutBox[] = [];

    for (const child of childElements) {
      const childStyle = this.styleEngine.getComputedStyle(child);

      if (childStyle.get('display') === 'none') {
        continue;
      }

      const childBox = this.layoutElement(
        child,
        contentWidth,
        availableHeight,
        0,
        0,
        incremental,
        dirtySet,
      );

      childBoxes.push(childBox);
    }

    // Use FlexLayout to compute the final box
    const box = this.flexLayout.layout(
      element,
      resolvedStyle,
      childBoxes,
      measuredTextLines,
      availableWidth,
      availableHeight,
      x,
      y,
    );

    this.cache.set(element, box);

    return box;
  }

  /**
   * Collects direct child elements and text content from an element's children.
   *
   * Element children are added to `childElements`. Text node content is added
   * to `textLines`.
   */
  private collectChildren(element: Element, childElements: Element[], textLines: string[]): void {
    let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];

    while (child) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        childElements.push(child as unknown as Element);
      } else if (child.nodeType === NodeType.TEXT_NODE) {
        const text = (child as unknown as CharacterData).data;

        if (text.length > 0) {
          textLines.push(text);
        }
      }

      child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
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
    const resolved = new Map(computedStyle);
    let hasPercentage = false;

    for (const [prop, value] of computedStyle) {
      if (value.endsWith('%')) {
        hasPercentage = true;
        const numericValue = parseFloat(value);

        if (!Number.isNaN(numericValue)) {
          const base = this.isHeightProperty(prop) ? availableHeight : availableWidth;
          const resolvedValue = Math.round((numericValue / 100) * base);

          resolved.set(prop, String(resolvedValue));
        }
      }
    }

    return hasPercentage ? resolved : computedStyle;
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
