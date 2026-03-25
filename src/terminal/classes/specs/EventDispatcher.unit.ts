import {describe, expect, it, vi} from 'vitest';

import {ClipboardEvent, KeyboardEvent, Window} from '../../../dom';
import type {TerminalInputEvent} from '../../types';
import {EventDispatcher} from '../EventDispatcher';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
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
});
