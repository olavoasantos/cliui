import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {Event, KeyboardEvent} from '@cliui/dom';
import {UiButton} from '../component';

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

describe('UiButton integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches click on Enter after explicit registration', async () => {
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
      UiButton.tagName,
      UiButton as unknown as CustomElementConstructor,
    );

    const button = terminal.document.createElement('ui-button') as UiButton;
    button.textContent = 'Submit';
    terminal.document.body.appendChild(button);

    await terminal.run();

    terminal.document.setActiveElement(button);

    const clicks: Event[] = [];

    button.addEventListener('click', ((event: Event) => {
      clicks.push(event);
    }) as EventListener);

    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(clicks).toHaveLength(1);

    terminal.exit();
  });

  it('shows pressed state on Space and dispatches click on release', async () => {
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
      UiButton.tagName,
      UiButton as unknown as CustomElementConstructor,
    );

    const button = terminal.document.createElement('ui-button') as UiButton;
    button.textContent = 'Cancel';
    terminal.document.body.appendChild(button);

    await terminal.run();

    terminal.document.setActiveElement(button);

    const clicks: Event[] = [];

    button.addEventListener('click', ((event: Event) => {
      clicks.push(event);
    }) as EventListener);

    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
      }),
    );

    expect(button.hasAttribute('pressed')).toBe(true);
    expect(clicks).toHaveLength(0);

    button.dispatchEvent(
      new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: ' ',
      }),
    );

    expect(button.hasAttribute('pressed')).toBe(false);
    expect(clicks).toHaveLength(1);

    terminal.exit();
  });

  it('blocks activation when disabled', async () => {
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
      UiButton.tagName,
      UiButton as unknown as CustomElementConstructor,
    );

    const button = terminal.document.createElement('ui-button') as UiButton;
    button.setAttribute('disabled', '');
    button.textContent = 'Disabled';
    terminal.document.body.appendChild(button);

    await terminal.run();

    const clicks: Event[] = [];

    button.addEventListener('click', ((event: Event) => {
      clicks.push(event);
    }) as EventListener);

    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(clicks).toHaveLength(0);
    expect(button.getAttribute('tabindex')).toBeNull();

    terminal.exit();
  });
});
