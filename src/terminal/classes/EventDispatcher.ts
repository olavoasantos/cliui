import {ClipboardEvent, FocusEvent, KeyboardEvent, MouseEvent, WheelEvent} from '../../dom';

import type {Document, Element} from '../../dom';
import type {LayoutBox} from '../../layout/types';
import type {
  TerminalInputEvent,
  TerminalKeyEvent,
  TerminalMouseButton,
  TerminalMouseEvent,
  TerminalPasteEvent,
} from '../types';

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
  private layoutRoot: LayoutBox | null = null;
  private activeMousePress: {target: Element; button: TerminalMouseButton} | null = null;

  /**
   * Creates a new dispatcher bound to a DOM document.
   *
   * @param document - The target document whose body receives events.
   */
  constructor(document: Document) {
    this.document = document;
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
    if (event.key === 'Tab') {
      this.document.focusNext(event.shift);
    }

    const target = this.document.activeElement ?? this.document.body;
    const keydown = this.createKeyboardEvent('keydown', event);
    const keyup = this.createKeyboardEvent('keyup', event);

    target.dispatchEvent(keydown);
    target.dispatchEvent(keyup);
  }

  private dispatchMouseEvent(event: TerminalMouseEvent): void {
    const targetBox = this.hitTestLayoutBox(event.column, event.row);
    const target = targetBox?.element ?? this.document.body;

    switch (event.eventType) {
      case 'press':
        this.activeMousePress = {target, button: event.button};
        this.handleMouseFocus(target);
        target.dispatchEvent(this.createMouseDomEvent('mousedown', event, targetBox));
        return;
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
        if (targetBox !== null) {
          this.updateScrollOffset(targetBox, event);
        }

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

    for (const box of this.flattenBoxes(this.layoutRoot)) {
      if (box.computedStyle.get('display') === 'none' || !this.containsPoint(box, column, row)) {
        continue;
      }

      return box;
    }

    return null;
  }

  private flattenBoxes(root: LayoutBox): LayoutBox[] {
    const flattened: Array<{box: LayoutBox; order: number}> = [];
    let order = 0;

    const visit = (box: LayoutBox): void => {
      flattened.push({box, order});
      order += 1;

      for (const child of box.children) {
        visit(child);
      }
    };

    visit(root);

    flattened.sort((left, right) => {
      if (left.box.zIndex !== right.box.zIndex) {
        return right.box.zIndex - left.box.zIndex;
      }

      return right.order - left.order;
    });

    return flattened.map((entry) => entry.box);
  }

  private updateScrollOffset(box: LayoutBox, event: TerminalMouseEvent): void {
    if (box.computedStyle.get('overflow') !== 'scroll') {
      return;
    }

    const delta = this.mapWheelDelta(event.button).deltaY;
    const maxScrollOffset = Math.max(
      0,
      (box.scrollHeight ?? box.contentHeight) - box.contentHeight,
    );
    const elementWithScroll = box.element as Element & {scrollTop?: number};
    const currentScrollOffset = elementWithScroll.scrollTop ?? box.scrollOffsetY ?? 0;
    const nextScrollOffset = Math.max(0, Math.min(maxScrollOffset, currentScrollOffset + delta));

    elementWithScroll.scrollTop = nextScrollOffset;
  }

  private containsPoint(box: LayoutBox, column: number, row: number): boolean {
    return (
      column >= box.x && row >= box.y && column < box.x + box.width && row < box.y + box.height
    );
  }

  /**
   * Manages focus transitions on mousedown.
   *
   * If the target has a `tabindex` attribute it receives focus.  Otherwise
   * the currently active element is blurred (focus returns to the body),
   * mirroring browser default behaviour.
   */
  private handleMouseFocus(target: Element): void {
    if (target.hasAttribute('tabindex')) {
      this.document.setActiveElement(target);
    } else if (this.document.activeElement !== this.document.body) {
      this.document.setActiveElement(null);
    }
  }

  private createMouseDomEvent(
    type: 'click' | 'mousedown' | 'mouseup' | 'mousemove',
    event: TerminalMouseEvent,
    targetBox?: LayoutBox | null,
  ): MouseEvent {
    return new MouseEvent(type, {
      bubbles: true,
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
    eventType: 'click' | 'mousedown' | 'mouseup' | 'mousemove',
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
