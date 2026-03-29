import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../../../classes/Terminal';
import {Event, KeyboardEvent, ToggleEvent} from '../../../dom';
import {UiDetails} from '../component';

import type {TerminalReadableInput} from '../../../terminal/types';

function createOutput() {
  return {
    stream: {
      columns: 40,
      rows: 10,
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

describe('UiDetails integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles open on Enter after explicit registration', async () => {
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
      UiDetails.tagName,
      UiDetails as unknown as CustomElementConstructor,
    );

    const details = terminal.document.createElement('ui-details') as UiDetails;
    const summary = terminal.document.createElement('ui-summary');
    summary.textContent = 'More info';
    details.appendChild(summary);

    const content = terminal.document.createElement('div');
    content.textContent = 'Detailed content here';
    details.appendChild(content);

    terminal.document.body.appendChild(details);

    await terminal.run();

    terminal.document.setActiveElement(details);

    expect(details.isOpen()).toBe(false);

    details.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(details.isOpen()).toBe(true);

    terminal.exit();
  });

  it('dispatches toggle event with correct states', async () => {
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
      UiDetails.tagName,
      UiDetails as unknown as CustomElementConstructor,
    );

    const details = terminal.document.createElement('ui-details') as UiDetails;
    const summary = terminal.document.createElement('ui-summary');
    summary.textContent = 'Toggle me';
    details.appendChild(summary);

    terminal.document.body.appendChild(details);

    await terminal.run();

    terminal.document.setActiveElement(details);

    const events: ToggleEvent[] = [];

    details.addEventListener('toggle', ((e: Event) => {
      events.push(e as ToggleEvent);
    }) as EventListener);

    details.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
      }),
    );

    expect(events).toHaveLength(1);
    expect(events[0]!.oldState).toBe('closed');
    expect(events[0]!.newState).toBe('open');

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
      UiDetails.tagName,
      UiDetails as unknown as CustomElementConstructor,
    );

    const details = terminal.document.createElement('ui-details') as UiDetails;
    details.setAttribute('disabled', '');

    const summary = terminal.document.createElement('ui-summary');
    summary.textContent = 'Disabled section';
    details.appendChild(summary);

    terminal.document.body.appendChild(details);

    await terminal.run();

    details.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(details.isOpen()).toBe(false);
    expect(details.getAttribute('tabindex')).toBeNull();

    terminal.exit();
  });
});
