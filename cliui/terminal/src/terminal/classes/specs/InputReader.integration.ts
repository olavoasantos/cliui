import {describe, expect, it, vi} from 'vitest';

import type {TerminalInputEvent, TerminalReadableInput} from '../../types';
import {InputReader} from '../InputReader';

function createReadableInput(): {
  input: TerminalReadableInput;
  emit(chunk: Buffer | string): void;
} {
  const listeners = new Set<(chunk: Buffer | string) => void>();

  return {
    input: {
      on(event, listener) {
        if (event === 'data') {
          listeners.add(listener);
        }

        return this;
      },
      off(event, listener) {
        if (event === 'data') {
          listeners.delete(listener);
        }

        return this;
      },
      resume: vi.fn(),
      pause: vi.fn(),
    },
    emit(chunk) {
      for (const listener of listeners) {
        listener(chunk);
      }
    },
  };
}

describe('InputReader integration', () => {
  it('translates fragmented terminal stream input into key, mouse, focus, paste, and fallback events', () => {
    const {input, emit} = createReadableInput();
    const reader = new InputReader(input);
    const events: TerminalInputEvent[] = [];

    reader.start((event) => {
      events.push(event);
    });

    emit(Buffer.from('\u001B[', 'utf8'));
    emit(Buffer.from('1;8D', 'utf8'));
    emit(Buffer.from('\u001B[200~paste', 'utf8'));
    emit(Buffer.from('d text\u001B[201~', 'utf8'));
    emit(Buffer.from('\u001B[<35;9;4M', 'utf8'));
    emit(Buffer.from('\u001B[I', 'utf8'));
    emit(Buffer.from('\u001B[?2026;', 'utf8'));
    emit(Buffer.from('1$y', 'utf8'));
    emit(Buffer.from('\u001BOx', 'utf8'));

    expect(events).toEqual([
      {
        type: 'key',
        key: 'ArrowLeft',
        code: 'ArrowLeft',
        ctrl: true,
        alt: true,
        shift: true,
      },
      {type: 'paste', text: 'pasted text'},
      {
        type: 'mouse',
        eventType: 'motion',
        button: 'none',
        column: 8,
        row: 3,
        ctrl: false,
        alt: false,
        shift: false,
      },
      {type: 'focus', focus: 'in'},
      {type: 'key', key: 'Escape', code: 'Escape', ctrl: false, alt: false, shift: false},
    ]);
  });
});
