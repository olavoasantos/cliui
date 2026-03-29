import {describe, expect, it} from 'vitest';

import {MouseEvent, WheelEvent, Window} from '../../../dom';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../../layout/types';
import {InputReader} from '../InputReader';
import {EventDispatcher} from '../EventDispatcher';

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

describe('EventDispatcher integration', () => {
  it('dispatches parsed mouse escape sequences through hit-testing into DOM events', () => {
    const window = new Window();
    const {document} = window;
    const reader = new InputReader({});
    const dispatcher = new EventDispatcher(document);
    const button = document.createElement('button');
    const events: Array<MouseEvent | WheelEvent> = [];

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
            width: 6,
            height: 4,
          }),
        ],
      }),
    );

    button.addEventListener('mousedown', (event) => {
      events.push(event as MouseEvent);
    });
    button.addEventListener('mouseup', (event) => {
      events.push(event as MouseEvent);
    });
    button.addEventListener('click', (event) => {
      events.push(event as MouseEvent);
    });
    button.addEventListener('mousemove', (event) => {
      events.push(event as MouseEvent);
    });
    button.addEventListener('wheel', (event) => {
      events.push(event as WheelEvent);
    });

    dispatcher.dispatchAll(
      reader.parse('\u001B[<0;4;3M\u001B[<0;4;3m\u001B[<32;5;3M\u001B[<65;5;3M'),
    );

    expect(events.map((event) => event.type)).toEqual([
      'mousedown',
      'mouseup',
      'click',
      'mousemove',
      'wheel',
    ]);
    expect(events[0]).toBeInstanceOf(MouseEvent);
    expect(events[0]?.target).toBe(button);
    expect(events[0]?.clientX).toBe(3);
    expect(events[0]?.clientY).toBe(2);
    expect(events[3]).toBeInstanceOf(MouseEvent);
    expect(events[3]?.type).toBe('mousemove');
    expect(events[4]).toBeInstanceOf(WheelEvent);
    expect((events[4] as WheelEvent).deltaY).toBe(1);
  });

  it('dispatches hover transition events from any-motion mouse sequences', () => {
    const window = new Window();
    const {document} = window;
    const reader = new InputReader({});
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
        height: 10,
        children: [
          createBox(document, {
            element: first,
            x: 2,
            y: 1,
            width: 4,
            height: 3,
          }),
          createBox(document, {
            element: second,
            x: 8,
            y: 1,
            width: 4,
            height: 3,
          }),
        ],
      }),
    );

    first.addEventListener('mouseenter', () => {
      events.push('first:enter');
    });
    first.addEventListener('mouseleave', () => {
      events.push('first:leave');
    });
    second.addEventListener('mouseenter', () => {
      events.push('second:enter');
    });

    dispatcher.dispatchAll(reader.parse('\u001B[<35;4;3M\u001B[<35;10;3M'));

    expect(events).toContain('first:enter');
    expect(events).toContain('first:leave');
    expect(events).toContain('second:enter');
    expect(document.hoveredElement).toBe(second);
  });
});
