import type {CustomElementConstructor} from '@cliui/dom';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {UiProgress} from '../component';

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

describe('UiProgress integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances animated progress from the terminal frame loop after explicit registration', async () => {
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
      UiProgress.tagName,
      UiProgress as unknown as CustomElementConstructor,
    );

    const progress = terminal.document.createElement('ui-progress') as UiProgress;
    progress.setAttribute('animated', '');
    progress.setAttribute('show-value', '');
    terminal.document.body.appendChild(progress);

    await terminal.run();

    expect(progress.textContent).toBe('░░░░░░░░░░ 0%');

    progress.setAttribute('value', '100');
    expect(progress.textContent).toBe('░░░░░░░░░░ 0%');

    await vi.advanceTimersByTimeAsync(100);
    expect(progress.textContent).not.toBe('░░░░░░░░░░ 0%');

    await vi.advanceTimersByTimeAsync(2_000);
    expect(progress.textContent).toBe('▓▓▓▓▓▓▓▓▓▓ 100%');

    terminal.exit();
  });
});
