import {afterEach, describe, expect, it, vi} from 'vitest';

import {DEFAULT_COLUMNS, DEFAULT_FPS, DEFAULT_ROWS} from '../../constants/terminal';
import {Window} from '../../dom';
import {Terminal} from '../Terminal';

import type {TerminalReadableInput} from '../../terminal/types';

type TerminalInternals = {
  output: NodeJS.WriteStream;
  input: TerminalReadableInput;
  fps: number;
  renderer: {cols: number; rows: number};
  terminalManager: {
    start(): void;
    stop(): void;
    detectCapabilities(): Promise<unknown>;
  };
  inputReader: {
    start(listener: (event: unknown) => void): void;
    stop(): void;
  };
};

function createOutput(overrides: Partial<NodeJS.WriteStream> = {}) {
  let value = '';

  return {
    stream: {
      columns: 20,
      rows: 6,
      write(chunk: string) {
        value += chunk;
        return true;
      },
      ...overrides,
    },
    read() {
      return value;
    },
  };
}

function createInput(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    resume: vi.fn(),
    pause: vi.fn(),
  };
}

describe('Terminal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('normalizes constructor options and wires default runtime dependencies', () => {
    const terminalWithDefaults = new Terminal();
    const defaultInternals = terminalWithDefaults as unknown as TerminalInternals;

    expect(defaultInternals.output).toBe(process.stdout);
    expect(defaultInternals.input).toBe(process.stdin as unknown as TerminalReadableInput);
    expect(defaultInternals.fps).toBe(DEFAULT_FPS);
    expect(defaultInternals.renderer.cols).toBe(process.stdout.columns ?? DEFAULT_COLUMNS);
    expect(defaultInternals.renderer.rows).toBe(process.stdout.rows ?? DEFAULT_ROWS);

    const output = createOutput({columns: 0, rows: Number.NaN});
    const input = createInput();
    const terminalWithFallbacks = new Terminal({
      fps: 29.9,
      output: output.stream,
      input,
    });
    const fallbackInternals = terminalWithFallbacks as unknown as TerminalInternals;

    expect(fallbackInternals.fps).toBe(29);
    expect(fallbackInternals.renderer.cols).toBe(DEFAULT_COLUMNS);
    expect(fallbackInternals.renderer.rows).toBe(DEFAULT_ROWS);

    const terminalWithInvalidFps = new Terminal({
      fps: Number.NEGATIVE_INFINITY,
      output: output.stream,
      input,
    });
    const invalidFpsInternals = terminalWithInvalidFps as unknown as TerminalInternals;

    expect(invalidFpsInternals.fps).toBe(DEFAULT_FPS);
  });

  it('uses an explicit window when provided in options', () => {
    const window = new Window();
    const terminal = new Terminal({window});
    expect(terminal.window).toBe(window);
    expect(terminal.document).toBe(window.document);
  });

  it('does not start the terminal loop more than once', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;
    const startSpy = vi.spyOn(internals.terminalManager, 'start');
    const detectSpy = vi
      .spyOn(internals.terminalManager, 'detectCapabilities')
      .mockResolvedValue({});
    const inputStartSpy = vi.spyOn(internals.inputReader, 'start');
    const processOnSpy = vi.spyOn(process, 'on');

    await terminal.run();
    const firstLoop = (terminal as unknown as {loop: NodeJS.Timeout | null}).loop;

    await terminal.run();

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(detectSpy).toHaveBeenCalledTimes(1);
    expect(inputStartSpy).toHaveBeenCalledTimes(1);
    expect(processOnSpy).toHaveBeenCalledTimes(1);
    expect((terminal as unknown as {loop: NodeJS.Timeout | null}).loop).toBe(firstLoop);
    expect(vi.getTimerCount()).toBe(1);

    terminal.exit();
  });

  it('cleans up timers, input listeners, and terminal state when exiting', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;
    vi.spyOn(internals.terminalManager, 'detectCapabilities').mockResolvedValue({});
    const stopSpy = vi.spyOn(internals.terminalManager, 'stop');
    const inputStopSpy = vi.spyOn(internals.inputReader, 'stop');
    const processOffSpy = vi.spyOn(process, 'off');

    await terminal.run();

    expect(vi.getTimerCount()).toBe(1);

    terminal.exit();
    terminal.exit();

    expect(inputStopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(processOffSpy).toHaveBeenCalledTimes(1);
    expect((terminal as unknown as {loop: NodeJS.Timeout | null}).loop).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(input.pause).toHaveBeenCalledTimes(1);
  });
});
