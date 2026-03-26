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
      button: 'left',
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
});
