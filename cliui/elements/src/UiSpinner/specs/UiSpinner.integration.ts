import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {UiSpinner} from '../component';

import type {TerminalReadableInput} from '@cliui/terminal';

function createOutput() {
  return {
    stream: {
      columns: 20,
      rows: 6,
      write(_chunk: string) {
        return true;
      },
    },
  };
}

function createInput(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => input),
    off: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => input),
    resume: vi.fn(),
    pause: vi.fn(),
  } as unknown as TerminalReadableInput;
}

const input = createInput();

describe('UiSpinner integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances from the terminal frame loop after explicit registration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input,
    });

    terminal.window.customElements.define(
      UiSpinner.tagName,
      UiSpinner as unknown as CustomElementConstructor,
    );

    const spinner = terminal.document.createElement('ui-spinner') as UiSpinner;
    spinner.setAttribute('label', 'Loading');
    terminal.document.body.appendChild(spinner);

    await terminal.run();

    expect(spinner.textContent).toBe('| Loading');

    await vi.advanceTimersByTimeAsync(100);
    expect(spinner.textContent).toBe('/ Loading');

    await vi.advanceTimersByTimeAsync(100);
    expect(spinner.textContent).toBe('- Loading');

    terminal.exit();
  });
});
