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
      '\u001B[?1049h\u001B[?25l\u001B[?1002h\u001B[?1006h\u001B[?1004h\u001B[?2004h',
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
      '\u001B[?1049h\u001B[?25l\u001B[?1002h\u001B[?1006h\u001B[?1004h\u001B[?2004h' +
        '\u001B[?2004l\u001B[?1004l\u001B[?1006l\u001B[?1002l\u001B[?25h\u001B[?1049l',
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
        '\u001B[?2004l\u001B[?1004l\u001B[?25h\u001B[?1049l',
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
      '\u001B[?25l\u001B[?1004h\u001B[?2004h\u001B[?2004l\u001B[?1004l\u001B[?25h',
    );
  });
});
