import {DEFAULT_COLUMNS, DEFAULT_FPS, DEFAULT_ROWS} from '../constants/terminal';
import {StyleEngine} from '../css';
import {Event, Window} from '../dom';
import {LayoutEngine} from '../layout';
import {Renderer} from '../renderer';
import {EventDispatcher, InputReader, TerminalManager} from '../terminal';

import type {Document} from '../dom';
import type {TerminalOptions} from '../types';
import type {TerminalOutput, TerminalReadableInput} from '../terminal/types';

/**
 * Public entry point that wires the DOM, style, layout, renderer, and terminal
 * I/O layers together.
 *
 * `run()` initializes terminal modes, performs an initial frame render, starts
 * the background frame loop, and returns once initialization is complete.
 * `exit()` stops the loop, detaches input handling, and restores the terminal.
 */
export class Terminal {
  /** Exposes the DOM window used by the terminal instance. */
  readonly window: Window;

  /** Exposes the DOM document used by the terminal instance. */
  readonly document: Document;

  private readonly output: TerminalOutput;
  private readonly input: TerminalReadableInput;
  private readonly fps: number;
  private readonly styleEngine: StyleEngine;
  private readonly layoutEngine: LayoutEngine;
  private readonly renderer: Renderer;
  private readonly terminalManager: TerminalManager;
  private readonly inputReader: InputReader;
  private readonly eventDispatcher: EventDispatcher;
  private readonly boundResizeListener = (): void => {
    this.handleResize();
  };
  private loop: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * Creates a new terminal pipeline instance.
   *
   * @param options - Terminal configuration and I/O streams.
   */
  constructor(options: TerminalOptions = {}) {
    this.window = new Window();
    this.document = this.window.document;
    this.output = options.output ?? (process.stdout as unknown as TerminalOutput);
    this.input = options.input ?? (process.stdin as unknown as TerminalReadableInput);
    this.fps = this.normalizeFps(options.fps);

    this.styleEngine = new StyleEngine();
    this.styleEngine.attach(this.document);
    this.styleEngine.markAllDirty();

    this.layoutEngine = new LayoutEngine(this.styleEngine);
    this.renderer = new Renderer(this.getColumns(), this.getRows());
    this.terminalManager = new TerminalManager({
      input: this.input,
      output: this.output,
      altScreen: options.altScreen ?? true,
      mouse: options.mouse ?? false,
    });
    this.inputReader = new InputReader(this.input);
    this.eventDispatcher = new EventDispatcher(this.document);
  }

  /**
   * Initializes terminal I/O, performs an initial render, and starts the
   * background frame loop.
   */
  async run(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.terminalManager.start();
    void this.terminalManager.detectCapabilities();
    this.inputReader.start((event) => {
      this.eventDispatcher.dispatch(event);
    });
    process.on('SIGWINCH', this.boundResizeListener);

    this.renderFrame();

    const interval = Math.max(1, Math.floor(1000 / this.fps));

    this.loop = setInterval(() => {
      this.renderFrame();
    }, interval);
  }

  /**
   * Stops the render loop, detaches input handling, and restores terminal mode.
   */
  exit(): void {
    if (!this.running) {
      return;
    }

    if (this.loop !== null) {
      clearInterval(this.loop);
      this.loop = null;
    }

    this.inputReader.stop();
    process.off('SIGWINCH', this.boundResizeListener);
    this.terminalManager.stop();
    this.running = false;
  }

  private handleResize(): void {
    if (!this.running) {
      return;
    }

    this.layoutEngine.clearCache();
    this.styleEngine.markAllDirty();
    this.renderFrame();
    this.window.dispatchEvent(new Event('resize'));
  }

  private renderFrame(): void {
    const columns = this.getColumns();
    const rows = this.getRows();

    if (columns !== this.renderer.cols || rows !== this.renderer.rows) {
      this.renderer.resize(columns, rows);
      this.layoutEngine.clearCache();
      this.styleEngine.markAllDirty();
      this.output.write('\u001B[2J\u001B[H');
    }

    if (this.styleEngine.getDirtyElements().size > 0) {
      this.styleEngine.recomputeDirty();
    }

    const layout = this.layoutEngine.layout(this.document.body, columns, rows);
    this.eventDispatcher.setLayoutRoot(layout);
    this.renderer.setSynchronizedOutputEnabled(
      this.terminalManager.getCapabilities().synchronizedOutput,
    );
    const output = this.renderer.render(layout);

    if (output.length > 0) {
      this.output.write(output);
    }
  }

  private getColumns(): number {
    return this.normalizeDimension(this.output.columns, DEFAULT_COLUMNS);
  }

  private getRows(): number {
    return this.normalizeDimension(this.output.rows, DEFAULT_ROWS);
  }

  private normalizeDimension(value: number | undefined, fallback: number): number {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }

    return Math.floor(value);
  }

  private normalizeFps(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_FPS;
    }

    return Math.floor(value);
  }
}
