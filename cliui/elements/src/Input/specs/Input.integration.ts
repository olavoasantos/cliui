import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {Event, KeyboardEvent} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Input} from '../component';

import type {TerminalReadableInput} from '@cliui/terminal';

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

describe('Input integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts typed input and dispatches events via [EDITABLE] system', async () => {
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
      Input.tagName,
      Input as unknown as CustomElementConstructor,
    );

    const input = terminal.document.createElement('input') as Input;
    input.setAttribute('tabindex', '0');
    input.setAttribute('width', '15');
    terminal.document.body.appendChild(input);

    await terminal.run();

    terminal.document.setActiveElement(input);

    const inputEvents: Event[] = [];

    input.addEventListener('input', ((event: Event) => {
      inputEvents.push(event);
    }) as never);

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

  it('dispatches change event on blur when value changed', async () => {
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
      Input.tagName,
      Input as unknown as CustomElementConstructor,
    );

    const input = terminal.document.createElement('input') as Input;
    input.setAttribute('tabindex', '0');
    terminal.document.body.appendChild(input);

    await terminal.run();

    terminal.document.setActiveElement(input);

    const changeEvents: Event[] = [];

    input.addEventListener('change', ((event: Event) => {
      changeEvents.push(event);
    }) as never);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'a',
      }),
    );

    terminal.document.setActiveElement(null);

    expect(changeEvents).toHaveLength(1);

    terminal.exit();
  });

  it('respects maxlength via [EDITABLE] config', async () => {
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
      Input.tagName,
      Input as unknown as CustomElementConstructor,
    );

    const input = terminal.document.createElement('input') as Input;
    input.setAttribute('tabindex', '0');
    input.setAttribute('maxlength', '3');
    terminal.document.body.appendChild(input);

    await terminal.run();

    terminal.document.setActiveElement(input);

    for (const key of ['a', 'b', 'c', 'd']) {
      input.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key}));
    }

    expect(input.getAttribute('value')).toBe('abc');

    terminal.exit();
  });
});
