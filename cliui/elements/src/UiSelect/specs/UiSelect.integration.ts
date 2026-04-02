import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {Event, KeyboardEvent} from '@cliui/dom';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../component';

import type {Element} from '@cliui/dom';
import type {TerminalReadableInput} from '@cliui/terminal';

function createOutput() {
  return {
    stream: {
      columns: 40,
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

function keyDown(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key}));
}

describe('UiSelect integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects options via keyboard navigation in the Terminal pipeline', async () => {
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
      UiSelect.tagName,
      UiSelect as unknown as CustomElementConstructor,
    );
    terminal.window.customElements.define(
      UiOption.tagName,
      UiOption as unknown as CustomElementConstructor,
    );

    const select = terminal.document.createElement('ui-select') as UiSelect;
    select.setAttribute('value', 'a');

    const optA = terminal.document.createElement('ui-option');
    optA.setAttribute('value', 'a');
    optA.textContent = 'Alpha';

    const optB = terminal.document.createElement('ui-option');
    optB.setAttribute('value', 'b');
    optB.textContent = 'Beta';

    const optC = terminal.document.createElement('ui-option');
    optC.setAttribute('value', 'c');
    optC.textContent = 'Charlie';

    select.appendChild(optA);
    select.appendChild(optB);
    select.appendChild(optC);
    terminal.document.body.appendChild(select);

    await terminal.run();

    terminal.document.setActiveElement(select);

    const inputEvents: Event[] = [];

    select.addEventListener('input', ((event: Event) => {
      inputEvents.push(event);
    }) as EventListener);

    keyDown(select, 'ArrowDown');

    expect(select.getAttribute('value')).toBe('b');
    expect(inputEvents).toHaveLength(1);

    keyDown(select, 'ArrowDown');

    expect(select.getAttribute('value')).toBe('c');
    expect(inputEvents).toHaveLength(2);

    terminal.exit();
  });

  it('opens dropdown and selects via Enter', async () => {
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
      UiSelect.tagName,
      UiSelect as unknown as CustomElementConstructor,
    );
    terminal.window.customElements.define(
      UiOption.tagName,
      UiOption as unknown as CustomElementConstructor,
    );

    const select = terminal.document.createElement('ui-select') as UiSelect;
    select.setAttribute('value', 'a');

    for (const [value, label] of [
      ['a', 'Alpha'],
      ['b', 'Beta'],
      ['c', 'Charlie'],
    ]) {
      const opt = terminal.document.createElement('ui-option');
      opt.setAttribute('value', value!);
      opt.textContent = label!;
      select.appendChild(opt);
    }

    terminal.document.body.appendChild(select);

    await terminal.run();

    terminal.document.setActiveElement(select);

    keyDown(select, 'Enter');

    expect(select.isOpen()).toBe(true);

    keyDown(select, 'ArrowDown');
    keyDown(select, 'ArrowDown');
    keyDown(select, 'Enter');

    expect(select.getAttribute('value')).toBe('c');
    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });
});
