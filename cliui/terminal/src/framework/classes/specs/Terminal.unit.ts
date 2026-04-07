import {afterEach, describe, expect, it, vi} from 'vitest';

import {DEFAULT_COLUMNS, DEFAULT_FPS, DEFAULT_ROWS} from '../../constants/terminal';
import {KeyboardEvent, Window} from '@cliui/dom';
import {Terminal} from '../Terminal';

import type {TerminalReadableInput} from '../../../terminal/types';

type TerminalInternals = {
  output: {
    write(chunk: string): boolean;
    columns?: number;
    rows?: number;
  };
  input: TerminalReadableInput;
  fps: number;
  renderer: {
    cols: number;
    rows: number;
    render(layout: unknown, overlays?: unknown[]): string;
  };
  layoutEngine: {
    layout(root: unknown, columns: number, rows: number): unknown;
  };
  caretManager: {
    tick(timestamp: number): boolean;
  };
  terminalManager: {
    start(): void;
    stop(): void;
    detectCapabilities(): Promise<unknown>;
  };
  inputReader: {
    start(listener: (event: unknown) => void): void;
    stop(): void;
  };
  renderFrame(): void;
  styleEngine: {
    markAllDirty(): void;
    recomputeDirty(): void;
    getComputedStyle(element: unknown): Map<string, string> | undefined;
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

  it('skips layout and rendering when a frame has no changes to process', () => {
    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;

    terminal.document.body.textContent = 'steady frame';
    internals.renderFrame();

    const layoutSpy = vi.spyOn(internals.layoutEngine, 'layout');
    const renderSpy = vi.spyOn(internals.renderer, 'render');

    internals.renderFrame();

    expect(layoutSpy).not.toHaveBeenCalled();
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('renders when tracked scroll offsets change even if the DOM is otherwise unchanged', () => {
    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;

    terminal.document.body.textContent = Array.from(
      {length: 20},
      (_, index) => `line ${index}`,
    ).join('\n');
    internals.renderFrame();

    const renderSpy = vi.spyOn(internals.renderer, 'render');
    (terminal.document.body as typeof terminal.document.body & {scrollTop?: number}).scrollTop = 1;

    internals.renderFrame();

    expect(renderSpy).toHaveBeenCalledOnce();
  });

  it('rerenders immediately when keyboard scrolling updates the body viewport', () => {
    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;

    terminal.document.body.textContent = Array.from(
      {length: 20},
      (_, index) => `line ${index}`,
    ).join('\n');
    internals.renderFrame();

    const renderFrameSpy = vi.spyOn(internals, 'renderFrame');

    terminal.document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowDown',
      }),
    );

    expect(renderFrameSpy).toHaveBeenCalledOnce();
    expect(
      (terminal.document.body as typeof terminal.document.body & {scrollTop?: number}).scrollTop,
    ).toBe(1);
  });

  it('renders when caret blinking changes even if the DOM is otherwise unchanged', () => {
    const output = createOutput();
    const input = createInput();
    const terminal = new Terminal({output: output.stream, input});
    const internals = terminal as unknown as TerminalInternals;

    terminal.document.body.textContent = 'caret frame';
    internals.renderFrame();

    vi.spyOn(internals.caretManager, 'tick').mockReturnValue(true);
    const renderSpy = vi.spyOn(internals.renderer, 'render');

    internals.renderFrame();

    expect(renderSpy).toHaveBeenCalledOnce();
  });

  describe('title bridge', () => {
    it('emits OSC 2 when document.title is set after run()', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();
      output.read(); // clear initial output
      const outputRef = createOutput();
      (terminal as unknown as TerminalInternals).output = outputRef.stream;

      terminal.document.title = 'My App';
      expect(outputRef.read()).toContain('\u001B]2;My App\u0007');

      terminal.exit();
    });

    it('emits push title (xterm) on run()', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();
      // Push title sequence: ESC[22;2t
      expect(output.read()).toContain('\u001B[22;2t');

      terminal.exit();
    });

    it('emits pop title (xterm) on exit()', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();
      output.read(); // clear
      const outputRef = createOutput();
      // Swap output to capture exit sequences
      (terminal as unknown as TerminalInternals).output = outputRef.stream;

      terminal.exit();
      // Pop title sequence: ESC[23;2t
      expect(outputRef.read()).toContain('\u001B[23;2t');
    });

    it('emits initial title on run() when <title> already exists', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      terminal.document.title = 'Pre-existing Title';
      await terminal.run();

      expect(output.read()).toContain('\u001B]2;Pre-existing Title\u0007');

      terminal.exit();
    });

    it('updates terminal title when <title> textContent is changed directly', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();

      const titleEl = terminal.document.createElement('title');
      titleEl.textContent = 'Direct Title';
      terminal.document.head.appendChild(titleEl);

      expect(output.read()).toContain('\u001B]2;Direct Title\u0007');

      terminal.exit();
    });
  });

  describe('CWD reporting', () => {
    it('emits OSC 7 on startup with process.cwd()', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();

      // OSC 7 format: ESC]7;file://hostname/path BEL
      expect(output.read()).toContain('\u001B]7;file://');

      terminal.exit();
    });

    it('initializes window.location.href to file:// URL', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();

      expect(terminal.window.location.href).toMatch(/^file:\/\//);
      expect(terminal.window.location.protocol).toBe('file:');

      terminal.exit();
    });

    it('emits OSC 7 when window.location.pathname changes', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();
      // Capture fresh output
      const freshOutput = createOutput();
      (terminal as unknown as TerminalInternals).output = freshOutput.stream;

      terminal.window.location.pathname = '/new/directory';

      expect(freshOutput.read()).toContain('\u001B]7;');
      expect(freshOutput.read()).toContain('/new/directory');

      terminal.exit();
    });
  });

  describe('cursor style bridge', () => {
    it('emits bar cursor sequence when focusing element with cursor: text', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      const el = terminal.document.createElement('div');
      el.setAttribute('tabindex', '0');
      el.style.cursor = 'text';
      terminal.document.body.appendChild(el);

      await terminal.run();
      // Ensure styles are computed
      const internals = terminal as unknown as TerminalInternals;
      internals.styleEngine.markAllDirty();
      internals.styleEngine.recomputeDirty();

      // Now trigger focus change
      terminal.document.setActiveElement(el);

      // The full output should contain the bar cursor sequence
      const fullOutput = output.read();
      // CSI 6 SP q = bar cursor
      expect(fullOutput).toContain('\u001B[6 q');

      terminal.exit();
    });

    it('emits block cursor sequence for cursor: default', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      const el = terminal.document.createElement('div');
      el.setAttribute('tabindex', '0');
      el.style.cursor = 'default';
      terminal.document.body.appendChild(el);

      await terminal.run();
      (terminal as unknown as TerminalInternals).styleEngine.markAllDirty();
      (terminal as unknown as TerminalInternals).styleEngine.recomputeDirty();

      terminal.document.setActiveElement(el);

      expect(output.read()).toContain('\u001B[2 q');

      terminal.exit();
    });

    it('hides cursor for cursor: none', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      const el = terminal.document.createElement('div');
      el.setAttribute('tabindex', '0');
      el.style.cursor = 'none';
      terminal.document.body.appendChild(el);

      await terminal.run();
      (terminal as unknown as TerminalInternals).renderFrame();

      const freshOutput = createOutput();
      (terminal as unknown as TerminalInternals).output = freshOutput.stream;

      terminal.document.setActiveElement(el);

      expect(freshOutput.read()).toContain('\u001B[?25l');

      terminal.exit();
    });

    it('resets cursor shape on exit', async () => {
      const output = createOutput();
      const input = createInput();
      const terminal = new Terminal({output: output.stream, input, altScreen: false});

      await terminal.run();

      const freshOutput = createOutput();
      (terminal as unknown as TerminalInternals).output = freshOutput.stream;

      terminal.exit();

      // CSI 0 SP q = reset cursor to default
      expect(freshOutput.read()).toContain('\u001B[0 q');
    });
  });
});
