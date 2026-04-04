import {ClipboardEvent, FocusEvent, KeyboardEvent, MouseEvent, WheelEvent} from '@cliui/dom';

import type {Document, Element, Performance} from '@cliui/dom';
import type {LayoutBox} from '../../layout/types';
import type {PendingEventTiming} from '../types/PendingEventTiming';
import type {
  TerminalInputEvent,
  TerminalKeyEvent,
  TerminalMouseButton,
  TerminalMouseEvent,
  TerminalPasteEvent,
} from '../types';

/** Rectangular clipping region for overflow containers. */
interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bridges parsed terminal input events into DOM events dispatched on the
 * document body.
 *
 * In Phase 1 all terminal keyboard and paste input targets `document.body`.
 * Because terminal input does not distinguish key press from key release,
 * every parsed key event dispatches a synthetic `keydown` immediately followed
 * by `keyup`.
 */
export class EventDispatcher {
  private document: Document;
  private performance: Performance | null = null;
  private layoutRoot: LayoutBox | null = null;
  private activeMousePress: {target: Element; button: TerminalMouseButton} | null = null;
  private pendingTimings: PendingEventTiming[] = [];
  private nextInteractionId = 1;
  private firstInputRecorded = false;

  /**
   * Creates a new dispatcher bound to a DOM document.
   *
   * @param document - The target document whose body receives events.
   */
  constructor(document: Document) {
    this.document = document;
  }

  /**
   * Sets the Performance instance for recording event timing entries.
   *
   * @param performance - The window.performance instance.
   */
  setPerformance(performance: Performance): void {
    this.performance = performance;
  }

  /**
   * Returns and clears all pending event timings awaiting frame finalization.
   */
  takePendingTimings(): PendingEventTiming[] {
    const timings = this.pendingTimings;
    this.pendingTimings = [];
    return timings;
  }

  /**
   * Dispatches one parsed terminal input event into the DOM.
   *
   * @param event - Parsed terminal key or paste event.
   */
  dispatch(event: TerminalInputEvent): void {
    if (event.type === 'key') {
      this.dispatchKeyEvent(event);
      return;
    }

    if (event.type === 'mouse') {
      this.dispatchMouseEvent(event);
      return;
    }

    if (event.type === 'focus') {
      this.dispatchWindowFocusEvent(event.focus);
      return;
    }

    if (event.type === 'paste') {
      this.dispatchPasteEvent(event);
    }
  }

  /**
   * Dispatches one parsed terminal input event with performance timing capture.
   *
   * Records `startTime` before dispatch and `processingStart`/`processingEnd`
   * around handler execution. The resulting `PendingEventTiming` entries are
   * finalized by the Terminal after the next `renderFrame()` completes.
   *
   * @param event - Parsed terminal key or paste event.
   * @param inputTimestamp - High-resolution timestamp when raw input bytes arrived.
   */
  dispatchTimed(event: TerminalInputEvent, inputTimestamp: number): void {
    // Focus events are not user interactions — no timing
    if (event.type === 'focus') {
      this.dispatchWindowFocusEvent(event.focus);
      return;
    }

    const perf = this.performance;
    if (!perf) {
      this.dispatch(event);
      return;
    }

    const interactionId = this.nextInteractionId++;
    const processingStart = perf.now();

    this.dispatch(event);

    const processingEnd = perf.now();
    const isFirst = !this.firstInputRecorded;

    if (isFirst) {
      this.firstInputRecorded = true;
    }

    const eventName = this.getEventName(event);

    // Record 'event' entry
    this.pendingTimings.push({
      options: {
        name: eventName,
        startTime: inputTimestamp,
        processingStart,
        processingEnd,
        duration: 0, // finalized after next frame
        interactionId,
        entryType: 'event',
      },
      isFirstInput: false,
    });

    // Record 'first-input' entry
    if (isFirst) {
      this.pendingTimings.push({
        options: {
          name: eventName,
          startTime: inputTimestamp,
          processingStart,
          processingEnd,
          duration: 0,
          interactionId,
          entryType: 'first-input',
        },
        isFirstInput: true,
      });
    }
  }

  private getEventName(event: TerminalInputEvent): string {
    switch (event.type) {
      case 'key':
        return 'keydown';
      case 'mouse':
        return event.eventType === 'wheel'
          ? 'wheel'
          : event.eventType === 'press'
            ? 'mousedown'
            : event.eventType === 'release'
              ? 'mouseup'
              : 'mousemove';
      case 'paste':
        return 'paste';
      default:
        return 'unknown';
    }
  }

  /**
   * Dispatches multiple parsed terminal input events in sequence.
   *
   * @param events - Parsed terminal input events.
   */
  dispatchAll(events: TerminalInputEvent[]): void {
    for (const event of events) {
      this.dispatch(event);
    }
  }

  /**
   * Sets the current layout tree used for terminal coordinate hit-testing.
   *
   * @param layoutRoot - The current root layout box, or `null` when unavailable.
   */
  setLayoutRoot(layoutRoot: LayoutBox | null): void {
    this.layoutRoot = layoutRoot;
  }

  /**
   * Returns the topmost element at the given terminal coordinates.
   *
   * Layout boxes are flattened into a single global z-order so the visually
   * topmost box wins, with document order as the tiebreaker for equal z-index
   * values.
   *
   * @param column - Zero-based terminal column.
   * @param row - Zero-based terminal row.
   * @returns The deepest matching element, or `null` when nothing is hit.
   */
  hitTest(column: number, row: number): Element | null {
    if (this.layoutRoot === null) {
      return null;
    }

    return this.hitTestLayoutBox(column, row)?.element ?? null;
  }

  private dispatchKeyEvent(event: TerminalKeyEvent): void {
    const target = this.document.activeElement ?? this.document.body;
    const keydown = this.createKeyboardEvent('keydown', event);

    target.dispatchEvent(keydown);

    // Only perform default Tab focus cycling if no handler prevented it
    if (event.key === 'Tab' && !keydown.defaultPrevented) {
      this.document.focusNext(event.shift);
    }

    const keyup = this.createKeyboardEvent('keyup', event);
    target.dispatchEvent(keyup);
  }

  private dispatchMouseEvent(event: TerminalMouseEvent): void {
    const targetBox = this.hitTestLayoutBox(event.column, event.row);
    const target = targetBox?.element ?? this.document.body;

    this.updateHoveredTarget(target, event);

    switch (event.eventType) {
      case 'press': {
        this.activeMousePress = {target, button: event.button};
        const mouseDownEvent = this.createMouseDomEvent('mousedown', event, targetBox);
        target.dispatchEvent(mouseDownEvent);

        if (!mouseDownEvent.defaultPrevented) {
          this.handleMouseFocus(target);
        }

        return;
      }
      case 'release': {
        const releasedButton =
          event.button === 'none' && this.activeMousePress !== null
            ? this.activeMousePress.button
            : event.button;
        const normalizedReleaseEvent =
          releasedButton === event.button ? event : {...event, button: releasedButton};

        target.dispatchEvent(
          this.createMouseDomEvent('mouseup', normalizedReleaseEvent, targetBox),
        );

        if (
          this.activeMousePress !== null &&
          this.activeMousePress.target === target &&
          this.isClickableButton(this.activeMousePress.button)
        ) {
          target.dispatchEvent(
            this.createMouseDomEvent(
              'click',
              {
                ...normalizedReleaseEvent,
                button: this.activeMousePress.button,
              },
              targetBox,
            ),
          );
        }

        this.activeMousePress = null;
        return;
      }
      case 'motion':
        target.dispatchEvent(this.createMouseDomEvent('mousemove', event, targetBox));
        return;
      case 'wheel':
        this.updateScrollOffset(target, event);
        target.dispatchEvent(this.createWheelDomEvent(event));
        return;
    }
  }

  private dispatchPasteEvent(event: TerminalPasteEvent): void {
    const clipboardData = {
      getData: (type: string): string => (type === 'text/plain' ? event.text : ''),
    } as DataTransfer;

    const target = this.document.activeElement ?? this.document.body;

    target.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }

  private dispatchWindowFocusEvent(focus: 'in' | 'out'): void {
    this.document.defaultView.dispatchEvent(new FocusEvent(focus === 'in' ? 'focus' : 'blur'));
  }

  private hitTestLayoutBox(column: number, row: number): LayoutBox | null {
    if (this.layoutRoot === null) {
      return null;
    }

    for (const entry of this.flattenBoxes(this.layoutRoot)) {
      if (entry.box.computedStyle.get('display') === 'none') {
        continue;
      }

      if (!this.containsPoint(entry.box, column, row)) {
        continue;
      }

      // Clip to ancestor scroll/hidden overflow viewports
      if (entry.clipRect && !this.isInsideClipRect(entry.clipRect, column, row)) {
        continue;
      }

      return entry.box;
    }

    return null;
  }

  private flattenBoxes(
    root: LayoutBox,
  ): Array<{box: LayoutBox; order: number; stackingZ: number; clipRect: ClipRect | null}> {
    const flattened: Array<{
      box: LayoutBox;
      order: number;
      stackingZ: number;
      clipRect: ClipRect | null;
    }> = [];
    let order = 0;

    const visit = (
      box: LayoutBox,
      parentStackingZ: number,
      parentClipRect: ClipRect | null,
    ): void => {
      const stackingZ = box.zIndex !== 0 ? box.zIndex : parentStackingZ;
      const overflow = box.computedStyle.get('overflow');
      const isClipping = overflow === 'scroll' || overflow === 'hidden';

      flattened.push({box, order, stackingZ, clipRect: parentClipRect});
      order += 1;

      // Propagate clip rect to children if this box clips overflow
      const childClipRect: ClipRect | null = isClipping
        ? this.intersectClipRects(parentClipRect, {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          })
        : parentClipRect;

      for (const child of box.children) {
        visit(child, stackingZ, childClipRect);
      }
    };

    visit(root, 0, null);

    flattened.sort((left, right) => {
      if (left.stackingZ !== right.stackingZ) {
        return right.stackingZ - left.stackingZ;
      }

      return right.order - left.order;
    });

    return flattened;
  }

  private isInsideClipRect(clip: ClipRect, column: number, row: number): boolean {
    return (
      column >= clip.x &&
      row >= clip.y &&
      column < clip.x + clip.width &&
      row < clip.y + clip.height
    );
  }

  private intersectClipRects(existing: ClipRect | null, next: ClipRect): ClipRect {
    if (existing === null) {
      return next;
    }

    const x = Math.max(existing.x, next.x);
    const y = Math.max(existing.y, next.y);
    const right = Math.min(existing.x + existing.width, next.x + next.width);
    const bottom = Math.min(existing.y + existing.height, next.y + next.height);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    };
  }

  /**
   * Walks up from the target element to find the nearest `overflow: scroll`
   * ancestor and applies the wheel delta to its `scrollTop`.
   */
  private updateScrollOffset(target: Element, event: TerminalMouseEvent): void {
    const delta = this.mapWheelDelta(event.button).deltaY;

    if (delta === 0) return;

    let current: Element | null = target;

    while (current) {
      const box = this.findBoxForElement(current);

      if (box && box.computedStyle.get('overflow') === 'scroll') {
        const maxScrollOffset = Math.max(
          0,
          (box.scrollHeight ?? box.contentHeight) - box.contentHeight,
        );
        const elementWithScroll = current as Element & {scrollTop?: number};
        const currentScrollOffset = elementWithScroll.scrollTop ?? box.scrollOffsetY ?? 0;
        const nextScrollOffset = Math.max(
          0,
          Math.min(maxScrollOffset, currentScrollOffset + delta),
        );

        elementWithScroll.scrollTop = nextScrollOffset;
        return;
      }

      current = current.parentElement as Element | null;
    }
  }

  /**
   * Finds the layout box for a given element by searching the layout tree.
   */
  private findBoxForElement(target: Element): LayoutBox | null {
    if (this.layoutRoot === null) return null;

    const search = (box: LayoutBox): LayoutBox | null => {
      if (box.element === target) return box;

      for (const child of box.children) {
        const found = search(child);
        if (found) return found;
      }

      return null;
    };

    return search(this.layoutRoot);
  }

  private containsPoint(box: LayoutBox, column: number, row: number): boolean {
    return (
      column >= box.x && row >= box.y && column < box.x + box.width && row < box.y + box.height
    );
  }

  private updateHoveredTarget(target: Element, event: TerminalMouseEvent): void {
    const previous = this.document.hoveredElement;

    if (previous === target) {
      this.document.setHoveredElement(target);
      return;
    }

    this.document.setHoveredElement(target);
    this.dispatchHoverTransitionEvents(previous, target, event);
  }

  private dispatchHoverTransitionEvents(
    previous: Element | null,
    next: Element | null,
    event: TerminalMouseEvent,
  ): void {
    if (previous === next) {
      return;
    }

    const previousChain = this.getElementChain(previous);
    const nextChain = this.getElementChain(next);
    const commonAncestor = this.findCommonAncestor(previousChain, nextChain);
    const previousLeaving =
      commonAncestor === null
        ? previousChain
        : previousChain.slice(0, previousChain.indexOf(commonAncestor));
    const nextEntering =
      commonAncestor === null ? nextChain : nextChain.slice(0, nextChain.indexOf(commonAncestor));

    if (previous !== null) {
      previous.dispatchEvent(
        this.createMouseDomEvent(
          'mouseout',
          event,
          this.findLayoutBoxForElement(previous),
          next,
          true,
        ),
      );
    }

    for (const element of previousLeaving) {
      element.dispatchEvent(
        this.createMouseDomEvent(
          'mouseleave',
          event,
          this.findLayoutBoxForElement(element),
          next,
          false,
        ),
      );
    }

    if (next !== null) {
      next.dispatchEvent(
        this.createMouseDomEvent(
          'mouseover',
          event,
          this.findLayoutBoxForElement(next),
          previous,
          true,
        ),
      );
    }

    for (const element of [...nextEntering].reverse()) {
      element.dispatchEvent(
        this.createMouseDomEvent(
          'mouseenter',
          event,
          this.findLayoutBoxForElement(element),
          previous,
          false,
        ),
      );
    }
  }

  private getElementChain(element: Element | null): Element[] {
    const chain = new Array<Element>();
    let current = element;

    while (current !== null) {
      chain.push(current);
      current = current.parentElement as Element | null;
    }

    return chain;
  }

  private findCommonAncestor(left: Element[], right: Element[]): Element | null {
    let leftIndex = left.length - 1;
    let rightIndex = right.length - 1;
    let commonAncestor: Element | null = null;

    while (leftIndex >= 0 && rightIndex >= 0 && left[leftIndex] === right[rightIndex]) {
      commonAncestor = left[leftIndex]!;
      leftIndex -= 1;
      rightIndex -= 1;
    }

    return commonAncestor;
  }

  private findLayoutBoxForElement(element: Element): LayoutBox | null {
    if (this.layoutRoot === null) {
      return null;
    }

    for (const entry of this.flattenBoxes(this.layoutRoot)) {
      if (entry.box.element === element) {
        return entry.box;
      }
    }

    return null;
  }

  /**
   * Manages focus transitions on mousedown.
   *
   * If the target has a `tabindex` attribute it receives focus.  Otherwise
   * the currently active element is blurred (focus returns to the body),
   * mirroring browser default behaviour.
   */
  private handleMouseFocus(target: Element): void {
    /* Walk up to find the nearest focusable ancestor */
    let current: Element | null = target;

    while (current) {
      if (current.hasAttribute('tabindex')) {
        this.document.setActiveElement(current);
        return;
      }

      current = current.parentElement as Element | null;
    }

    /* No focusable ancestor found — blur to body */
    if (this.document.activeElement !== this.document.body) {
      this.document.setActiveElement(null);
    }
  }

  private createMouseDomEvent(
    type:
      | 'click'
      | 'mousedown'
      | 'mouseup'
      | 'mousemove'
      | 'mouseenter'
      | 'mouseleave'
      | 'mouseover'
      | 'mouseout',
    event: TerminalMouseEvent,
    targetBox?: LayoutBox | null,
    relatedTarget?: Element | null,
    bubbles = true,
  ): MouseEvent {
    return new MouseEvent(type, {
      bubbles,
      cancelable: true,
      clientX: event.column,
      clientY: event.row,
      screenX: event.column,
      screenY: event.row,
      offsetX: targetBox ? event.column - targetBox.contentX : 0,
      offsetY: targetBox ? event.row - targetBox.contentY : 0,
      ctrlKey: event.ctrl,
      altKey: event.alt,
      shiftKey: event.shift,
      button: this.mapMouseButton(event.button),
      buttons: this.mapButtons(event.button, type),
      relatedTarget,
    });
  }

  private createWheelDomEvent(event: TerminalMouseEvent): WheelEvent {
    const {deltaX, deltaY} = this.mapWheelDelta(event.button);

    return new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: event.column,
      clientY: event.row,
      screenX: event.column,
      screenY: event.row,
      ctrlKey: event.ctrl,
      altKey: event.alt,
      shiftKey: event.shift,
      button: this.mapMouseButton(event.button),
      buttons: 0,
      deltaX,
      deltaY,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
    });
  }

  private mapMouseButton(button: TerminalMouseButton): number {
    switch (button) {
      case 'left':
      case 'wheel-up':
      case 'wheel-down':
      case 'wheel-left':
      case 'wheel-right':
        return 0;
      case 'middle':
        return 1;
      case 'right':
        return 2;
      case 'backward':
        return 3;
      case 'forward':
        return 4;
      case 'button10':
        return 5;
      case 'button11':
        return 6;
      case 'none':
        return 0;
    }
  }

  private mapButtons(
    button: TerminalMouseButton,
    eventType:
      | 'click'
      | 'mousedown'
      | 'mouseup'
      | 'mousemove'
      | 'mouseenter'
      | 'mouseleave'
      | 'mouseover'
      | 'mouseout',
  ): number {
    if (eventType === 'mouseup' || eventType === 'click') {
      return 0;
    }

    switch (button) {
      case 'left':
        return 1;
      case 'right':
        return 2;
      case 'middle':
        return 4;
      case 'backward':
        return 8;
      case 'forward':
        return 16;
      case 'button10':
        return 32;
      case 'button11':
        return 64;
      case 'wheel-up':
      case 'wheel-down':
      case 'wheel-left':
      case 'wheel-right':
      case 'none':
        return 0;
    }
  }

  private mapWheelDelta(button: TerminalMouseButton): {deltaX: number; deltaY: number} {
    switch (button) {
      case 'wheel-up':
        return {deltaX: 0, deltaY: -1};
      case 'wheel-down':
        return {deltaX: 0, deltaY: 1};
      case 'wheel-left':
        return {deltaX: -1, deltaY: 0};
      case 'wheel-right':
        return {deltaX: 1, deltaY: 0};
      default:
        return {deltaX: 0, deltaY: 0};
    }
  }

  private isClickableButton(button: TerminalMouseButton): boolean {
    return button === 'left' || button === 'middle' || button === 'right';
  }

  private createKeyboardEvent(type: 'keydown' | 'keyup', event: TerminalKeyEvent): KeyboardEvent {
    return new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrl,
      altKey: event.alt,
      shiftKey: event.shift,
    });
  }
}
