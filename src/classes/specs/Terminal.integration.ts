import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '../Terminal';

function createOutput() {
  let value = '';

  return {
    stream: {
      columns: 20,
      rows: 6,
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
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
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
      input,
    });

    terminal.document.body.textContent = 'Hello terminal';

    await terminal.run();

    expect(terminal.document).toBe(terminal.window.document);
    expect(output.read()).toContain('\u001B[?25l');
    expect(output.read()).toContain('Hello');
    expect(output.read()).toContain('terminal');
    expect(input.setRawMode).toHaveBeenCalledWith(true);
    expect(input.on).toHaveBeenCalledWith('data', expect.any(Function));

    terminal.exit();

    expect(input.off).toHaveBeenCalledWith('data', expect.any(Function));
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(output.read()).toContain('\u001B[?25h');
    expect(output.read()).toContain('\u001B[?2004l');
  });

  it('handles SIGWINCH by rerendering and dispatching window resize', async () => {
    vi.useFakeTimers();

    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 30,
      output: output.stream,
      input,
    });
    const resizeListener = vi.fn();

    terminal.document.body.textContent = 'Resize me';
    terminal.window.addEventListener('resize', resizeListener);

    await terminal.run();

    output.stream.columns = 10;
    output.stream.rows = 4;
    process.emit('SIGWINCH');

    const renderer = (terminal as unknown as {renderer: {cols: number; rows: number}}).renderer;

    expect(resizeListener).toHaveBeenCalledOnce();
    expect(renderer.cols).toBe(10);
    expect(renderer.rows).toBe(4);

    terminal.exit();
  });
});
