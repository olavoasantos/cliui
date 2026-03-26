import {describe, expect, it, vi} from 'vitest';

import type {TerminalInputEvent, TerminalReadableInput} from '../../types';
import {InputReader} from '../InputReader';

function createReadableInput() {
  const listeners = new Map<string, Set<(chunk: Buffer) => void>>();

  const input: TerminalReadableInput = {
    on(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)?.add(listener as (chunk: Buffer) => void);
      return this;
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener as (chunk: Buffer) => void);
      return this;
    },
    resume: vi.fn(),
    pause: vi.fn(),
  };

  return {
    input,
    emit(chunk: string) {
      for (const listener of listeners.get('data') ?? []) {
        listener(Buffer.from(chunk, 'utf8'));
      }
    },
  };
}

describe('InputReader', () => {
  it('parses printable characters into key events', () => {
    const reader = new InputReader({});

    expect(reader.parse('a')).toEqual([
      {type: 'key', key: 'a', code: 'KeyA', ctrl: false, alt: false, shift: false},
    ]);
  });

  it('parses common control keys', () => {
    const reader = new InputReader({});

    expect(reader.parse('\r\t\u007F\u001B')).toEqual([
      {type: 'key', key: 'Enter', code: 'Enter', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'Tab', code: 'Tab', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'Backspace', code: 'Backspace', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'Escape', code: 'Escape', ctrl: false, alt: false, shift: false},
    ]);
  });

  it('parses arrow and navigation escape sequences with modifiers', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[A\u001B[1;5C\u001B[3~\u001B[5~')).toEqual([
      {type: 'key', key: 'ArrowUp', code: 'ArrowUp', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'ArrowRight', code: 'ArrowRight', ctrl: true, alt: false, shift: false},
      {type: 'key', key: 'Delete', code: 'Delete', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'PageUp', code: 'PageUp', ctrl: false, alt: false, shift: false},
    ]);
  });

  it('parses function keys from SS3 and CSI sequences', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001BOP\u001BOQ\u001B[15~\u001B[24~')).toEqual([
      {type: 'key', key: 'F1', code: 'F1', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'F2', code: 'F2', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'F5', code: 'F5', ctrl: false, alt: false, shift: false},
      {type: 'key', key: 'F12', code: 'F12', ctrl: false, alt: false, shift: false},
    ]);
  });

  it('parses ctrl and alt modified printable keys', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u0003\u001Bx')).toEqual([
      {type: 'key', key: 'c', code: 'KeyC', ctrl: true, alt: false, shift: false},
      {type: 'key', key: 'x', code: 'KeyX', ctrl: false, alt: true, shift: false},
    ]);
  });

  it('parses bracketed paste and buffers partial paste chunks', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[200~hello')).toEqual([]);
    expect(reader.parse(' world\u001B[201~')).toEqual([{type: 'paste', text: 'hello world'}]);
  });

  it('parses SGR mouse press, release, motion, and wheel events', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[<0;3;5M\u001B[<0;3;5m\u001B[<34;8;13M\u001B[<64;10;4M')).toEqual([
      {
        type: 'mouse',
        eventType: 'press',
        button: 'left',
        column: 2,
        row: 4,
        ctrl: false,
        alt: false,
        shift: false,
      },
      {
        type: 'mouse',
        eventType: 'release',
        button: 'left',
        column: 2,
        row: 4,
        ctrl: false,
        alt: false,
        shift: false,
      },
      {
        type: 'mouse',
        eventType: 'motion',
        button: 'right',
        column: 7,
        row: 12,
        ctrl: false,
        alt: false,
        shift: false,
      },
      {
        type: 'mouse',
        eventType: 'wheel',
        button: 'wheel-up',
        column: 9,
        row: 3,
        ctrl: false,
        alt: false,
        shift: false,
      },
    ]);
  });

  it('parses SGR mouse modifiers and additional buttons', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[<20;4;7M\u001B[<129;12;9M')).toEqual([
      {
        type: 'mouse',
        eventType: 'press',
        button: 'left',
        column: 3,
        row: 6,
        ctrl: true,
        alt: false,
        shift: true,
      },
      {
        type: 'mouse',
        eventType: 'press',
        button: 'forward',
        column: 11,
        row: 8,
        ctrl: false,
        alt: false,
        shift: false,
      },
    ]);
  });

  it('buffers incomplete SGR mouse sequences until enough bytes arrive', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[<0;12')).toEqual([]);
    expect(reader.parse(';8M')).toEqual([
      {
        type: 'mouse',
        eventType: 'press',
        button: 'left',
        column: 11,
        row: 7,
        ctrl: false,
        alt: false,
        shift: false,
      },
    ]);
  });

  it('parses terminal focus reporting sequences', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[I\u001B[O')).toEqual([
      {type: 'focus', focus: 'in'},
      {type: 'focus', focus: 'out'},
    ]);
  });

  it('buffers incomplete focus reporting sequences until enough bytes arrive', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[')).toEqual([]);
    expect(reader.parse('I')).toEqual([{type: 'focus', focus: 'in'}]);
  });

  it('buffers incomplete escape sequences until enough bytes arrive', () => {
    const reader = new InputReader({});

    expect(reader.parse('\u001B[')).toEqual([]);
    expect(reader.parse('A')).toEqual([
      {type: 'key', key: 'ArrowUp', code: 'ArrowUp', ctrl: false, alt: false, shift: false},
    ]);
  });

  it('reads data events from a stream and stops reading after stop()', () => {
    const {input, emit} = createReadableInput();
    const listener = vi.fn<(event: TerminalInputEvent) => void>();
    const reader = new InputReader(input);

    reader.start(listener);
    emit('a');
    emit('\u001B[15~');
    reader.stop();
    emit('b');

    expect(input.resume).toHaveBeenCalledOnce();
    expect(input.pause).toHaveBeenCalledOnce();
    expect(listener.mock.calls).toEqual([
      [{type: 'key', key: 'a', code: 'KeyA', ctrl: false, alt: false, shift: false}],
      [{type: 'key', key: 'F5', code: 'F5', ctrl: false, alt: false, shift: false}],
    ]);
  });
});
