import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../Terminal';

import type {TerminalColorProfile, TerminalReadableInput} from '../../terminal/types';

type RendererInternals = {
  cols: number;
  rows: number;
  synchronizedOutputEnabled: boolean;
  colorProfile: TerminalColorProfile;
};

function createOutput(options: {colorDepth?: number} = {}) {
  let value = '';

  return {
    stream: {
      columns: 20,
      rows: 6,
      getColorDepth: options.colorDepth === undefined ? undefined : () => options.colorDepth!,
      write(chunk: string) {
        value += chunk;
        return true;
      },
    },
    read() {
      return value;
    },
  };
}

function createInput(): {stream: TerminalReadableInput; emit(chunk: Buffer | string): void} {
  const listeners = new Set<(chunk: Buffer | string) => void>();
  let stream!: TerminalReadableInput;

  stream = {
    setRawMode: vi.fn(),
    on: vi.fn(
      (event: 'data', listener: (chunk: Buffer | string) => void): TerminalReadableInput => {
        if (event === 'data') {
          listeners.add(listener);
        }

        return stream;
      },
    ),
    off: vi.fn(
      (event: 'data', listener: (chunk: Buffer | string) => void): TerminalReadableInput => {
        if (event === 'data') {
          listeners.delete(listener);
        }

        return stream;
      },
    ),
    resume: vi.fn(),
    pause: vi.fn(),
  };

  return {
    stream,
    emit(chunk: Buffer | string) {
      for (const listener of listeners) {
        listener(chunk);
      }
    },
  };
}

describe('Terminal integration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the full terminal pipeline and restores the terminal on exit', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 30,
      output: output.stream,
      input: input.stream,
    });

    terminal.document.body.textContent = 'Hello terminal';

    await terminal.run();

    expect(terminal.document).toBe(terminal.window.document);
    expect(output.read()).toContain('\u001B[?25l');
    expect(output.read()).toContain('Hello');
    expect(output.read()).toContain('terminal');
    expect(input.stream.setRawMode).toHaveBeenCalledWith(true);
    expect(input.stream.on).toHaveBeenCalledWith('data', expect.any(Function));
    expect(input.stream.resume).toHaveBeenCalledTimes(1);

    terminal.exit();

    expect(input.stream.off).toHaveBeenCalledWith('data', expect.any(Function));
    expect(input.stream.pause).toHaveBeenCalledTimes(1);
    expect(input.stream.setRawMode).toHaveBeenLastCalledWith(false);
    expect(output.read()).toContain('\u001B[?25h');
    expect(output.read()).toContain('\u001B[?2004l');
  });

  it('handles SIGWINCH by clearing, rerendering, and dispatching window resize', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 30,
      output: output.stream,
      input: input.stream,
    });
    const resizeListener = vi.fn();

    terminal.document.body.textContent = 'Resize me';
    terminal.window.addEventListener('resize', resizeListener);

    await terminal.run();

    output.stream.columns = 10;
    output.stream.rows = 4;
    process.emit('SIGWINCH');

    const renderer = (terminal as unknown as {renderer: RendererInternals}).renderer;

    expect(resizeListener).toHaveBeenCalledOnce();
    expect(renderer.cols).toBe(10);
    expect(renderer.rows).toBe(4);
    expect(output.read()).toContain('\u001B[2J\u001B[H');

    terminal.exit();
  });

  it('applies detected terminal capabilities to renderer output after startup', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 30,
      output: output.stream,
      input: input.stream,
    });
    const terminalManager = (
      terminal as unknown as {
        terminalManager: {
          detectCapabilities(): Promise<unknown>;
          getCapabilities(): {
            synchronizedOutput: boolean;
            unicodeWidth: boolean;
            colorProfile: TerminalColorProfile;
          };
        };
      }
    ).terminalManager;
    let capabilitiesDetected = false;

    vi.spyOn(terminalManager, 'detectCapabilities').mockImplementation(async () => {
      capabilitiesDetected = true;
      return {
        synchronizedOutput: true,
        unicodeWidth: true,
        colorProfile: 'ansi256',
      };
    });
    vi.spyOn(terminalManager, 'getCapabilities').mockImplementation(() => ({
      synchronizedOutput: capabilitiesDetected,
      unicodeWidth: capabilitiesDetected,
      colorProfile: capabilitiesDetected ? 'ansi256' : 'none',
    }));

    const title = terminal.document.createElement('div');
    title.textContent = 'Capabilities';
    title.style.color = '#ff0000';
    terminal.document.body.appendChild(title);

    await terminal.run();
    await Promise.resolve();
    await Promise.resolve();

    const renderer = (terminal as unknown as {renderer: RendererInternals}).renderer;

    expect(renderer.synchronizedOutputEnabled).toBe(true);
    expect(renderer.colorProfile).toBe('ansi256');
    expect(output.read()).toContain('\u001B[?2026h');
    expect(output.read()).toContain('\u001B[38;5;');

    terminal.exit();
  });
});
