import {describe, expect, it, vi} from 'vitest';

import {ClipboardEvent, KeyboardEvent, MouseEvent, WheelEvent, Window} from '../../../dom';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../../layout/types';
import type {TerminalInputEvent} from '../../types';
import {EventDispatcher} from '../EventDispatcher';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

function style(props: Record<string, string> = {}): ComputedStyle {
  return new Map(Object.entries(props));
}

function createBox(document: Window['document'], overrides: Partial<LayoutBox> = {}): LayoutBox {
  return {
    element: overrides.element ?? document.createElement('div'),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 1,
    height: overrides.height ?? 1,
    contentX: overrides.contentX ?? overrides.x ?? 0,
    contentY: overrides.contentY ?? overrides.y ?? 0,
    contentWidth: overrides.contentWidth ?? overrides.width ?? 1,
    contentHeight: overrides.contentHeight ?? overrides.height ?? 1,
    computedStyle: overrides.computedStyle ?? style(),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
    ...overrides,
  };
}

describe('EventDispatcher', () => {
  it('dispatches keydown followed by keyup to document.body', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const events: KeyboardEvent[] = [];

    document.body.addEventListener('keydown', (event) => {
      events.push(event as KeyboardEvent);
    });
    document.body.addEventListener('keyup', (event) => {
      events.push(event as KeyboardEvent);
    });

    dispatcher.dispatch({
      type: 'key',
      key: 'a',
      code: 'KeyA',
      ctrl: false,
      alt: true,
      shift: true,
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toBeInstanceOf(KeyboardEvent);
    expect(events[0]?.type).toBe('keydown');
    expect(events[1]?.type).toBe('keyup');
    expect(events[0]?.target).toBe(document.body);
    expect(events[0]?.key).toBe('a');
    expect(events[0]?.code).toBe('KeyA');
    expect(events[0]?.altKey).toBe(true);
    expect(events[0]?.shiftKey).toBe(true);
    expect(events[0]?.ctrlKey).toBe(false);
  });

  it('dispatches paste events to document.body with clipboard text data', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const listener = vi.fn<(event: ClipboardEvent) => void>();

    document.body.addEventListener('paste', (event) => {
      listener(event as ClipboardEvent);
    });

    dispatcher.dispatch({type: 'paste', text: 'hello world'});

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0];
    expect(event).toBeInstanceOf(ClipboardEvent);
    expect(event?.type).toBe('paste');
    expect(event?.target).toBe(document.body);
    expect(event?.clipboardData?.getData('text/plain')).toBe('hello world');
  });

  it('dispatches sequences of parsed terminal events in order', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const order: string[] = [];

    document.body.addEventListener('keydown', (event) => {
      order.push(`${(event as KeyboardEvent).type}:${(event as KeyboardEvent).key}`);
    });
    document.body.addEventListener('keyup', (event) => {
      order.push(`${(event as KeyboardEvent).type}:${(event as KeyboardEvent).key}`);
    });
    document.body.addEventListener('paste', () => {
      order.push('paste');
    });

    const events: TerminalInputEvent[] = [
      {type: 'key', key: 'Enter', code: 'Enter', ctrl: false, alt: false, shift: false},
      {type: 'paste', text: 'text'},
    ];

    dispatcher.dispatchAll(events);

    expect(order).toEqual(['keydown:Enter', 'keyup:Enter', 'paste']);
  });

  it('hit-tests the deepest matching element in reverse document order', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const earlier = document.createElement('div');
    const later = document.createElement('button');
    const child = document.createElement('span');
    const layout = createBox(document, {
      element: document.body,
      x: 0,
      y: 0,
      width: 20,
      height: 10,
      children: [
        createBox(document, {
          element: earlier,
          x: 2,
          y: 2,
          width: 5,
          height: 4,
        }),
        createBox(document, {
          element: later,
          x: 2,
          y: 2,
          width: 5,
          height: 4,
          children: [
            createBox(document, {
              element: child,
              x: 3,
              y: 3,
              width: 2,
              height: 2,
            }),
          ],
        }),
      ],
    });

    dispatcher.setLayoutRoot(layout);

    expect(dispatcher.hitTest(4, 4)).toBe(child);
    expect(dispatcher.hitTest(2, 2)).toBe(later);
  });

  it('ignores display none boxes during hit-testing', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const visible = document.createElement('div');
    const hidden = document.createElement('button');

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: visible,
            x: 1,
            y: 1,
            width: 4,
            height: 4,
          }),
          createBox(document, {
            element: hidden,
            x: 1,
            y: 1,
            width: 4,
            height: 4,
            computedStyle: style({display: 'none'}),
          }),
        ],
      }),
    );

    expect(dispatcher.hitTest(2, 2)).toBe(visible);
  });

  it('returns null when no layout box is hit', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 4,
        height: 4,
      }),
    );

    expect(dispatcher.hitTest(8, 8)).toBeNull();
  });

  it('hit-tests the highest z-index element at overlapping coordinates', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const lower = document.createElement('div');
    const higher = document.createElement('button');

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: higher,
            x: 2,
            y: 2,
            width: 4,
            height: 4,
            zIndex: 2,
          }),
          createBox(document, {
            element: lower,
            x: 1,
            y: 1,
            width: 4,
            height: 4,
            zIndex: 1,
          }),
        ],
      }),
    );

    expect(dispatcher.hitTest(3, 3)).toBe(higher);
  });

  it('uses document order as the tiebreaker for equal z-index values during hit-testing', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const earlier = document.createElement('div');
    const later = document.createElement('button');

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: earlier,
            x: 1,
            y: 1,
            width: 4,
            height: 4,
            zIndex: 5,
          }),
          createBox(document, {
            element: later,
            x: 2,
            y: 2,
            width: 4,
            height: 4,
            zIndex: 5,
          }),
        ],
      }),
    );

    expect(dispatcher.hitTest(3, 3)).toBe(later);
  });

  it('clips hit-testing to scroll container visible viewport ', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const elementBelow = document.createElement('button');
    const scrollContainer = document.createElement('div');
    const scrollChild = document.createElement('div');

    // DOM order: elementBelow first, then scrollContainer
    // This means scrollChild has the highest flattening order and
    // gets priority in hit-testing. Without clipping, it swallows
    // clicks outside the scroll container's visible viewport.
    document.body.appendChild(elementBelow);
    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(scrollChild);

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        children: [
          createBox(document, {
            element: elementBelow,
            x: 0,
            y: 5,
            width: 20,
            height: 5,
          }),
          // Scroll container viewport: rows 0–4 (height 5)
          // But child extends to row 14 (height 15)
          createBox(document, {
            element: scrollContainer,
            x: 0,
            y: 0,
            width: 20,
            height: 5,
            contentX: 0,
            contentY: 0,
            contentWidth: 20,
            contentHeight: 5,
            computedStyle: style({overflow: 'scroll'}),
            scrollOffsetY: 0,
            scrollHeight: 15,
            children: [
              createBox(document, {
                element: scrollChild,
                x: 0,
                y: 0,
                width: 20,
                height: 15,
              }),
            ],
          }),
        ],
      }),
    );

    // Click at row 6 — should hit the button below, not the scroll child
    expect(dispatcher.hitTest(5, 6)).toBe(elementBelow);
  });

  it('does not hit-test children scrolled above the scroll viewport ', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const scrollContainer = document.createElement('div');
    const scrolledOutChild = document.createElement('div');
    const visibleChild = document.createElement('div');

    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(scrolledOutChild);
    scrollContainer.appendChild(visibleChild);

    // Scroll container viewport: rows 0–4 (height 5)
    // scrolledOutChild has been offset to y=-3 (scrolled above viewport)
    // visibleChild is at y=0 (visible)
    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        children: [
          createBox(document, {
            element: scrollContainer,
            x: 0,
            y: 0,
            width: 20,
            height: 5,
            contentX: 0,
            contentY: 0,
            contentWidth: 20,
            contentHeight: 5,
            computedStyle: style({overflow: 'scroll'}),
            scrollOffsetY: 3,
            scrollHeight: 10,
            children: [
              createBox(document, {
                element: scrolledOutChild,
                x: 0,
                y: -3,
                width: 20,
                height: 2,
              }),
              createBox(document, {
                element: visibleChild,
                x: 0,
                y: 0,
                width: 20,
                height: 5,
              }),
            ],
          }),
        ],
      }),
    );

    // Click at row 1 — should hit visibleChild, not scrolledOutChild
    expect(dispatcher.hitTest(5, 1)).toBe(visibleChild);
  });

  it('dispatches mouse down, up, and click events to the hit-tested element with bubbling', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const button = document.createElement('button');
    document.body.appendChild(button);
    const targetEvents: MouseEvent[] = [];
    const bubbled: string[] = [];

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: button,
            x: 1,
            y: 1,
            width: 4,
            height: 3,
          }),
        ],
      }),
    );

    button.addEventListener('mousedown', (event) => {
      targetEvents.push(event as MouseEvent);
    });
    button.addEventListener('mouseup', (event) => {
      targetEvents.push(event as MouseEvent);
    });
    button.addEventListener('click', (event) => {
      targetEvents.push(event as MouseEvent);
    });
    document.body.addEventListener('mousedown', () => {
      bubbled.push('mousedown');
    });
    document.body.addEventListener('mouseup', () => {
      bubbled.push('mouseup');
    });
    document.body.addEventListener('click', () => {
      bubbled.push('click');
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 2,
      row: 2,
      ctrl: true,
      alt: false,
      shift: true,
    });
    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'release',
      button: 'none',
      column: 2,
      row: 2,
      ctrl: true,
      alt: false,
      shift: true,
    });

    expect(targetEvents.map((event) => event.type)).toEqual(['mousedown', 'mouseup', 'click']);
    expect(targetEvents[0]).toBeInstanceOf(MouseEvent);
    expect(targetEvents[0]?.target).toBe(button);
    expect(targetEvents[0]?.clientX).toBe(2);
    expect(targetEvents[0]?.clientY).toBe(2);
    expect(targetEvents[0]?.button).toBe(0);
    expect(targetEvents[0]?.buttons).toBe(1);
    expect(targetEvents[0]?.ctrlKey).toBe(true);
    expect(targetEvents[0]?.shiftKey).toBe(true);
    expect(targetEvents[2]?.buttons).toBe(0);
    expect(bubbled).toEqual(['mousedown', 'mouseup', 'click']);
  });

  it('dispatches mouseover and mouseenter when the pointer first moves onto an element', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const button = document.createElement('button');
    const events: string[] = [];

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: button,
            x: 1,
            y: 1,
            width: 4,
            height: 2,
          }),
        ],
      }),
    );

    button.addEventListener('mouseover', () => {
      events.push('mouseover');
    });
    button.addEventListener('mouseenter', () => {
      events.push('mouseenter');
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'motion',
      button: 'none',
      column: 2,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(events).toEqual(['mouseover', 'mouseenter']);
    expect(document.hoveredElement).toBe(button);
  });

  it('dispatches mouseout/mouseleave and mouseover/mouseenter when moving between elements', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const first = document.createElement('button');
    const second = document.createElement('button');
    const events: string[] = [];

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 5,
        children: [
          createBox(document, {
            element: first,
            x: 1,
            y: 1,
            width: 4,
            height: 2,
          }),
          createBox(document, {
            element: second,
            x: 8,
            y: 1,
            width: 4,
            height: 2,
          }),
        ],
      }),
    );

    first.addEventListener('mouseout', () => {
      events.push('first:out');
    });
    first.addEventListener('mouseleave', () => {
      events.push('first:leave');
    });
    second.addEventListener('mouseover', () => {
      events.push('second:over');
    });
    second.addEventListener('mouseenter', () => {
      events.push('second:enter');
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'motion',
      button: 'none',
      column: 2,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    events.length = 0;

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'motion',
      button: 'none',
      column: 9,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(events).toEqual(['first:out', 'first:leave', 'second:over', 'second:enter']);
    expect(document.hoveredElement).toBe(second);
  });

  it('dispatches wheel events with wheel deltas to the hit-tested element', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const region = document.createElement('div');
    const listener = vi.fn<(event: WheelEvent) => void>();

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: region,
            x: 0,
            y: 0,
            width: 10,
            height: 10,
          }),
        ],
      }),
    );

    region.addEventListener('wheel', (event) => {
      listener(event as WheelEvent);
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'wheel',
      button: 'wheel-down',
      column: 4,
      row: 5,
      ctrl: false,
      alt: true,
      shift: false,
    });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0];
    expect(event).toBeInstanceOf(WheelEvent);
    expect(event?.type).toBe('wheel');
    expect(event?.target).toBe(region);
    expect(event?.clientX).toBe(4);
    expect(event?.clientY).toBe(5);
    expect(event?.deltaY).toBe(1);
    expect(event?.deltaMode).toBe(WheelEvent.DOM_DELTA_LINE);
    expect(event?.altKey).toBe(true);
  });

  it('updates scroll state for scrollable wheel targets and clamps it to content bounds', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const region = document.createElement('div');

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        children: [
          createBox(document, {
            element: region,
            x: 0,
            y: 0,
            width: 10,
            height: 3,
            contentX: 0,
            contentY: 0,
            contentWidth: 10,
            contentHeight: 3,
            computedStyle: style({overflow: 'scroll'}),
            scrollOffsetY: 1,
            scrollHeight: 7,
          }),
        ],
      }),
    );

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'wheel',
      button: 'wheel-down',
      column: 1,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'wheel',
      button: 'wheel-down',
      column: 1,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'wheel',
      button: 'wheel-down',
      column: 1,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect((region as typeof region & {scrollTop?: number}).scrollTop).toBe(4);
  });

  it('cycles focus with Tab and Shift+Tab in document order', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const first = document.createElement('button');
    const second = document.createElement('button');

    first.setAttribute('tabindex', '0');
    second.setAttribute('tabindex', '0');
    document.body.appendChild(first);
    document.body.appendChild(second);

    dispatcher.dispatch({
      type: 'key',
      key: 'Tab',
      code: 'Tab',
      ctrl: false,
      alt: false,
      shift: false,
    });
    expect(document.activeElement).toBe(first);

    dispatcher.dispatch({
      type: 'key',
      key: 'Tab',
      code: 'Tab',
      ctrl: false,
      alt: false,
      shift: false,
    });
    expect(document.activeElement).toBe(second);

    dispatcher.dispatch({
      type: 'key',
      key: 'Tab',
      code: 'Tab',
      ctrl: false,
      alt: false,
      shift: true,
    });
    expect(document.activeElement).toBe(first);
  });

  it('dispatches keyboard and paste events to document.activeElement', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const input = document.createElement('input');
    const order: string[] = [];

    input.setAttribute('tabindex', '0');
    document.body.appendChild(input);
    document.setActiveElement(input);

    input.addEventListener('keydown', (event) => {
      order.push(`${(event as KeyboardEvent).type}:${(event as KeyboardEvent).key}`);
    });
    input.addEventListener('keyup', (event) => {
      order.push(`${(event as KeyboardEvent).type}:${(event as KeyboardEvent).key}`);
    });
    input.addEventListener('paste', (event) => {
      order.push((event as ClipboardEvent).clipboardData?.getData('text/plain') ?? '');
    });

    dispatcher.dispatch({
      type: 'key',
      key: 'x',
      code: 'KeyX',
      ctrl: false,
      alt: false,
      shift: false,
    });
    dispatcher.dispatch({type: 'paste', text: 'hello'});

    expect(order).toEqual(['keydown:x', 'keyup:x', 'hello']);
  });

  it('dispatches focus and blur events on window from terminal focus input', () => {
    const {window, document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const events: string[] = [];

    window.addEventListener('focus', () => {
      events.push('focus');
    });
    window.addEventListener('blur', () => {
      events.push('blur');
    });

    dispatcher.dispatch({type: 'focus', focus: 'in'});
    dispatcher.dispatch({type: 'focus', focus: 'out'});

    expect(events).toEqual(['focus', 'blur']);
  });

  it('falls back to document.body for mouse events when no layout root is available', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const events: MouseEvent[] = [];

    document.body.addEventListener('mousemove', (event) => {
      events.push(event as MouseEvent);
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'motion',
      button: 'none',
      column: 7,
      row: 4,
      ctrl: false,
      alt: true,
      shift: false,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe(document.body);
    expect(events[0]?.buttons).toBe(0);
    expect(events[0]?.altKey).toBe(true);
  });

  it('normalizes release buttons without dispatching click events for non-clickable buttons', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const region = document.createElement('div');
    const events: string[] = [];

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 8,
        height: 4,
        children: [
          createBox(document, {
            element: region,
            x: 0,
            y: 0,
            width: 8,
            height: 4,
          }),
        ],
      }),
    );

    region.addEventListener('mousedown', (event) => {
      events.push(`${(event as MouseEvent).type}:${(event as MouseEvent).button}`);
    });
    region.addEventListener('mouseup', (event) => {
      events.push(`${(event as MouseEvent).type}:${(event as MouseEvent).button}`);
    });
    region.addEventListener('click', () => {
      events.push('click');
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'forward',
      column: 1,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'release',
      button: 'none',
      column: 1,
      row: 1,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(events).toEqual(['mousedown:4', 'mouseup:4']);
  });

  it('maps horizontal wheel input and preserves existing element scroll state', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const region = document.createElement('div') as typeof document.body & {scrollTop?: number};
    const listener = vi.fn<(event: WheelEvent) => void>();

    region.scrollTop = 2;

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 12,
        height: 6,
        children: [
          createBox(document, {
            element: region,
            x: 0,
            y: 0,
            width: 12,
            height: 4,
            contentWidth: 12,
            contentHeight: 4,
            computedStyle: style({overflow: 'scroll'}),
            scrollOffsetY: 1,
            scrollHeight: 9,
          }),
        ],
      }),
    );

    region.addEventListener('wheel', (event) => {
      listener(event as unknown as WheelEvent);
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'wheel',
      button: 'wheel-right',
      column: 2,
      row: 1,
      ctrl: true,
      alt: false,
      shift: true,
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]?.deltaX).toBe(1);
    expect(listener.mock.calls[0]?.[0]?.deltaY).toBe(0);
    expect(region.scrollTop).toBe(2);
  });

  it('populates offsetX and offsetY relative to the target content area', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const button = document.createElement('button');
    document.body.appendChild(button);
    const events: MouseEvent[] = [];

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        children: [
          createBox(document, {
            element: button,
            x: 2,
            y: 1,
            width: 10,
            height: 3,
            contentX: 3,
            contentY: 2,
            contentWidth: 8,
            contentHeight: 1,
          }),
        ],
      }),
    );

    button.addEventListener('mousedown', (event) => {
      events.push(event as MouseEvent);
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 7,
      row: 2,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.offsetX).toBe(4);
    expect(events[0]?.offsetY).toBe(0);
    expect(events[0]?.clientX).toBe(7);
    expect(events[0]?.clientY).toBe(2);
  });

  it('defaults offsetX and offsetY to zero when no layout box is hit', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const events: MouseEvent[] = [];

    document.body.addEventListener('mousedown', (event) => {
      events.push(event as MouseEvent);
    });

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 5,
      row: 3,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.offsetX).toBe(0);
    expect(events[0]?.offsetY).toBe(0);
  });

  it('focuses a tabindexed element on mousedown', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const input = document.createElement('input');
    input.setAttribute('tabindex', '0');
    document.body.appendChild(input);

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        children: [
          createBox(document, {
            element: input,
            x: 0,
            y: 0,
            width: 10,
            height: 1,
          }),
        ],
      }),
    );

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 3,
      row: 0,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(document.activeElement).toBe(input);
  });

  it('blurs the active element when clicking a non-focusable area', () => {
    const {document} = createEnv();
    const dispatcher = new EventDispatcher(document);
    const input = document.createElement('input');
    input.setAttribute('tabindex', '0');
    document.body.appendChild(input);
    document.setActiveElement(input);

    dispatcher.setLayoutRoot(
      createBox(document, {
        element: document.body,
        x: 0,
        y: 0,
        width: 20,
        height: 10,
        children: [
          createBox(document, {
            element: input,
            x: 0,
            y: 0,
            width: 10,
            height: 1,
          }),
        ],
      }),
    );

    dispatcher.dispatch({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 15,
      row: 5,
      ctrl: false,
      alt: false,
      shift: false,
    });

    expect(document.activeElement).toBe(document.body);
  });
});
