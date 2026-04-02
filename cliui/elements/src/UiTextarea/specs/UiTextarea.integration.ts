import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {Event, KeyboardEvent} from '@cliui/dom';
import {UiTextarea} from '../component';

import type {Element} from '@cliui/dom';
import type {TerminalReadableInput} from '@cliui/terminal';

function createOutput() {
  return {
    stream: {
      columns: 50,
      rows: 12,
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

function typeKey(
  element: Element,
  key: string,
  mods: {ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean} = {},
): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...mods,
    }),
  );
}

describe('UiTextarea integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts multi-line input via Enter and dispatches events', async () => {
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
      UiTextarea.tagName,
      UiTextarea as unknown as CustomElementConstructor,
    );

    const textarea = terminal.document.createElement('ui-textarea') as UiTextarea;
    textarea.setAttribute('tabindex', '0');
    textarea.setAttribute('cols', '20');
    textarea.setAttribute('rows', '4');
    terminal.document.body.appendChild(textarea);

    await terminal.run();

    terminal.document.setActiveElement(textarea);

    const inputEvents: Event[] = [];

    textarea.addEventListener('input', ((event: Event) => {
      inputEvents.push(event);
    }) as EventListener);

    typeKey(textarea, 'h');
    typeKey(textarea, 'i');
    typeKey(textarea, 'Enter');
    typeKey(textarea, 'w');
    typeKey(textarea, 'o');
    typeKey(textarea, 'r');
    typeKey(textarea, 'l');
    typeKey(textarea, 'd');

    expect(textarea.getAttribute('value')).toBe('hi\nworld');
    expect(inputEvents.length).toBeGreaterThanOrEqual(7);

    terminal.exit();
  });

  it('supports ArrowUp/Down navigation between lines', async () => {
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
      UiTextarea.tagName,
      UiTextarea as unknown as CustomElementConstructor,
    );

    const textarea = terminal.document.createElement('ui-textarea') as UiTextarea;
    textarea.setAttribute('tabindex', '0');
    textarea.setAttribute('cols', '20');
    textarea.setAttribute('rows', '4');
    terminal.document.body.appendChild(textarea);

    await terminal.run();

    terminal.document.setActiveElement(textarea);

    typeKey(textarea, 'a');
    typeKey(textarea, 'b');
    typeKey(textarea, 'c');
    typeKey(textarea, 'Enter');
    typeKey(textarea, 'd');
    typeKey(textarea, 'e');
    typeKey(textarea, 'f');

    expect(textarea.getAttribute('value')).toBe('abc\ndef');

    typeKey(textarea, 'ArrowUp');
    typeKey(textarea, 'x');

    expect(textarea.getAttribute('value')).toBe('abcx\ndef');

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
      UiTextarea.tagName,
      UiTextarea as unknown as CustomElementConstructor,
    );

    const textarea = terminal.document.createElement('ui-textarea') as UiTextarea;
    textarea.setAttribute('tabindex', '0');
    terminal.document.body.appendChild(textarea);

    await terminal.run();

    terminal.document.setActiveElement(textarea);

    const changeEvents: Event[] = [];

    textarea.addEventListener('change', ((event: Event) => {
      changeEvents.push(event);
    }) as EventListener);

    typeKey(textarea, 'a');
    typeKey(textarea, 'Enter');
    typeKey(textarea, 'b');

    terminal.document.setActiveElement(null);

    expect(changeEvents).toHaveLength(1);

    terminal.exit();
  });

  it('supports backspace across lines', async () => {
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
      UiTextarea.tagName,
      UiTextarea as unknown as CustomElementConstructor,
    );

    const textarea = terminal.document.createElement('ui-textarea') as UiTextarea;
    textarea.setAttribute('tabindex', '0');
    terminal.document.body.appendChild(textarea);

    await terminal.run();

    terminal.document.setActiveElement(textarea);

    typeKey(textarea, 'a');
    typeKey(textarea, 'Enter');
    typeKey(textarea, 'b');
    typeKey(textarea, 'Backspace');
    typeKey(textarea, 'Backspace');

    expect(textarea.getAttribute('value')).toBe('a');

    terminal.exit();
  });
});
