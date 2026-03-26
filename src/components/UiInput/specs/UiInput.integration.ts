import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../../../classes/Terminal';
import {Event, KeyboardEvent} from '../../../dom';
import {UiInput} from '../component';

import type {TerminalReadableInput} from '../../../terminal/types';

function createOutput() {
  return {
    stream: {
      columns: 40,
      rows: 6,
      write(_chunk: string) {
        return true;
      },
    },
  };
}

function createStdin(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    off: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    resume: vi.fn(),
    pause: vi.fn(),
  } as unknown as TerminalReadableInput;
}

const stdin = createStdin();

describe('UiInput integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts typed input and dispatches events after explicit registration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    terminal.window.customElements.define(
      UiInput.tagName,
      UiInput as unknown as CustomElementConstructor,
    );

    const input = terminal.document.createElement('ui-input') as UiInput;
    input.setAttribute('tabindex', '0');
    input.setAttribute('width', '15');
    terminal.document.body.appendChild(input);

    await terminal.run();

    terminal.document.setActiveElement(input);

    const inputEvents: Event[] = [];

    input.addEventListener('input', ((event: Event) => {
      inputEvents.push(event);
    }) as EventListener);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'h',
      }),
    );

    expect(input.getAttribute('value')).toBe('h');
    expect(inputEvents).toHaveLength(1);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'i',
      }),
    );

    expect(input.getAttribute('value')).toBe('hi');
    expect(inputEvents).toHaveLength(2);

    terminal.exit();
  });
});
