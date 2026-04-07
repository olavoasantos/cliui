import {beforeEach, describe, expect, it, vi} from 'vitest';

import {TerminalManager} from '../TerminalManager';

function createOutput() {
  let value = '';

  return {
    stream: {
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

function createInput() {
  return {
    setRawMode: vi.fn(),
  };
}

function createReadableInput() {
  const listeners = new Set<(chunk: Buffer | string) => void>();

  return {
    stream: {
      setRawMode: vi.fn(),
      on: vi.fn((event: 'data', listener: (chunk: Buffer | string) => void) => {
        if (event === 'data') {
          listeners.add(listener);
        }

        return undefined;
      }),
      off: vi.fn((event: 'data', listener: (chunk: Buffer | string) => void) => {
        if (event === 'data') {
          listeners.delete(listener);
        }

        return undefined;
      }),
    },
    emit(chunk: Buffer | string) {
      for (const listener of listeners) {
        listener(chunk);
      }
    },
  };
}

describe('TerminalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables raw mode and writes startup sequences in the expected order', () => {
    const output = createOutput();
    const input = createInput();
    const manager = new TerminalManager({
      input,
      output: output.stream,
      altScreen: true,
      mouse: true,
    });

    manager.start();

    expect(input.setRawMode).toHaveBeenCalledWith(true);
    expect(output.read()).toBe(
      '\u001B[?1049h\u001B[?25l\u001B[?1003h\u001B[?1006h\u001B[?1004h\u001B[?2004h',
    );
  });

  it('omits optional startup sequences when alt screen and mouse are disabled', () => {
    const output = createOutput();
    const input = createInput();
    const manager = new TerminalManager({
      input,
      output: output.stream,
      altScreen: false,
      mouse: false,
    });

    manager.start();

    expect(input.setRawMode).toHaveBeenCalledWith(true);
    expect(output.read()).toBe('\u001B[?25l\u001B[?1004h\u001B[?2004h');
  });

  it('reverses terminal modes on shutdown in reverse order', () => {
    const output = createOutput();
    const input = createInput();
    const manager = new TerminalManager({
      input,
      output: output.stream,
      altScreen: true,
      mouse: true,
    });

    manager.start();
    manager.stop();

    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true);
    expect(input.setRawMode).toHaveBeenNthCalledWith(2, false);
    expect(output.read()).toBe(
      '\u001B[?1049h\u001B[?25l\u001B[?1003h\u001B[?1006h\u001B[?1004h\u001B[?2004h' +
        '\u001B[?2004l\u001B[?1004l\u001B[?1006l\u001B[?1003l\u001B[?25h\u001B[0m\u001B[?1049l',
    );
  });

  it('is idempotent across repeated start and stop calls', () => {
    const output = createOutput();
    const input = createInput();
    const manager = new TerminalManager({
      input,
      output: output.stream,
      altScreen: true,
      mouse: false,
    });

    manager.start();
    manager.start();
    manager.stop();
    manager.stop();

    expect(input.setRawMode).toHaveBeenCalledTimes(2);
    expect(output.read()).toBe(
      '\u001B[?1049h\u001B[?25l\u001B[?1004h\u001B[?2004h' +
        '\u001B[?2004l\u001B[?1004l\u001B[?25h\u001B[0m\u001B[?1049l',
    );
  });

  it('gracefully skips raw mode toggling when the input stream is not raw-capable', () => {
    const output = createOutput();
    const manager = new TerminalManager({
      input: {},
      output: output.stream,
      altScreen: false,
      mouse: false,
    });

    manager.start();
    manager.stop();

    expect(output.read()).toBe(
      '\u001B[?25l\u001B[?1004h\u001B[?2004h\u001B[?2004l\u001B[?1004l\u001B[?25h\u001B[0m',
    );
  });

  it('maps terminal color depth to a stored color profile', async () => {
    const output = createOutput();
    const input = createInput();
    const manager = new TerminalManager({
      input,
      output: {
        ...output.stream,
        getColorDepth: () => 24,
      },
      altScreen: false,
      mouse: false,
    });

    await manager.detectCapabilities();

    expect(manager.getCapabilities()).toEqual({
      colorProfile: 'truecolor',
      synchronizedOutput: false,
      unicodeWidth: false,
      graphicsProtocol: 'none',
      notificationProtocol: 'none',
    });
  });

  it('detects synchronized output and unicode width support from terminal mode responses', async () => {
    const output = createOutput();
    const input = createReadableInput();
    const manager = new TerminalManager({
      input: input.stream,
      output: {
        ...output.stream,
        getColorDepth: () => 8,
      },
      altScreen: false,
      mouse: false,
    });

    const detection = manager.detectCapabilities();

    input.emit('\u001B[?2026;1$y');
    input.emit('\u001B[?2027;2$y');

    await detection;

    expect(output.read()).toContain('\u001B[?2026$p');
    expect(output.read()).toContain('\u001B[?2027$p');
    expect(manager.getCapabilities()).toEqual({
      colorProfile: 'ansi256',
      synchronizedOutput: true,
      unicodeWidth: true,
      graphicsProtocol: 'none',
      notificationProtocol: 'none',
    });
  });

  it('degrades gracefully when capability probes cannot receive responses', async () => {
    const output = createOutput();
    const manager = new TerminalManager({
      input: createInput(),
      output: {
        ...output.stream,
        getColorDepth: () => 4,
      },
      altScreen: false,
      mouse: false,
    });

    await manager.detectCapabilities();

    expect(manager.getCapabilities()).toEqual({
      colorProfile: 'ansi16',
      synchronizedOutput: false,
      unicodeWidth: false,
      graphicsProtocol: 'none',
      notificationProtocol: 'none',
    });
  });

  it('times out unsupported mode probes without hanging startup', async () => {
    vi.useFakeTimers();

    try {
      const output = createOutput();
      const input = createReadableInput();
      const manager = new TerminalManager({
        input: input.stream,
        output: {
          ...output.stream,
          getColorDepth: () => 1,
        },
        altScreen: false,
        mouse: false,
      });

      const detection = manager.detectCapabilities(5);

      // Advance past the mode probes (synchronizedOutput + unicodeWidth)
      await vi.advanceTimersByTimeAsync(5);
      // Advance past the graphics protocol probe (Kitty query)
      await vi.advanceTimersByTimeAsync(5);
      await detection;

      expect(manager.getCapabilities()).toEqual({
        colorProfile: 'none',
        synchronizedOutput: false,
        unicodeWidth: false,
        graphicsProtocol: 'none',
        notificationProtocol: 'none',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores mismatched mode responses and keeps probing until each requested mode settles', async () => {
    const output = createOutput();
    const input = createReadableInput();
    const manager = new TerminalManager({
      input: input.stream,
      output: {
        ...output.stream,
        getColorDepth: () => 2,
      },
      altScreen: false,
      mouse: false,
    });

    const detection = manager.detectCapabilities();

    input.emit('\u001B[?2027;0$y');
    input.emit('\u001B[?2026;0$y');
    input.emit('\u001B[?2027;3$y');

    await detection;

    expect(manager.getCapabilities()).toEqual({
      colorProfile: 'none',
      synchronizedOutput: false,
      unicodeWidth: false,
      graphicsProtocol: 'none',
      notificationProtocol: 'none',
    });
    expect(input.stream.off).toHaveBeenCalledTimes(3);
  });
});
