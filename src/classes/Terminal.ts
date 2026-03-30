import {DEFAULT_COLUMNS, DEFAULT_FPS, DEFAULT_ROWS} from '../constants/terminal';
import {EDITABLE_STATE} from '../constants/editableState';
import {StyleEngine} from '../css';
import {Event, InputEvent, Window} from '../dom';
import {selfAndDescendants} from '../dom/utilities/selfAndDescendants';
import {LayoutEngine} from '../layout';
import {cellWidth} from '../layout/utilities/cellWidth';
import {Renderer} from '../renderer';
import {CaretManager} from '../terminal/classes/CaretManager';
import {EDITABLE} from '../terminal/constants/editable';
import {computeVisualLines} from '../terminal/utilities/computeVisualLines';
import {findLineForCursor} from '../terminal/utilities/findLineForCursor';
import {handleCaretKeyDown} from '../terminal/utilities/handleCaretKeyDown';
import {EventDispatcher, InputReader, TerminalManager} from '../terminal';
import {resolveWindow} from '../utilities/resolveWindow';
import {segmentGraphemes} from '../utilities/segmentGraphemes';

import type {Document, Element} from '../dom';
import type {KeyboardEvent} from '../dom/classes/KeyboardEvent';
import type {TerminalFrameAware} from '../types/TerminalFrameAware';
import type {EditableStateElement} from '../types/EditableStateElement';
import type {TerminalOptions} from '../types';
import type {Editable} from '../terminal/types/Editable';
import type {EditableConfiguration} from '../terminal/types/EditableConfiguration';
import type {EditableState} from '../terminal/types/EditableState';
import type {TerminalOutput, TerminalReadableInput} from '../terminal/types';

/**
 * Public entry point that wires the DOM, style, layout, renderer, and terminal
 * I/O layers together.
 *
 * `run()` initializes terminal modes, performs an initial frame render, starts
 * the background frame loop, and returns once initialization is complete.
 * `exit()` stops the render loop, detaches input handling, and restores the terminal.
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
  private readonly caretManager = new CaretManager();
  private clipboardBuffer = '';
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
    this.window = resolveWindow(options);
    this.document = this.window.document;
    this.output = options.output ?? (process.stdout as unknown as TerminalOutput);
    this.input = options.input ?? (process.stdin as unknown as TerminalReadableInput);
    this.fps = this.normalizeFps(options.fps);

    this.styleEngine = new StyleEngine();
    this.styleEngine.attach(this.document);
    this.styleEngine.markAllDirty();

    this.layoutEngine = new LayoutEngine(this.styleEngine);
    this.renderer = new Renderer(this.getColumns(), this.getRows());
    this.styleEngine.onAtRule('border-style', (rule) => {
      if (rule.prelude) {
        this.renderer.borderStyles.register(rule);
      }
    });
    this.terminalManager = new TerminalManager({
      input: this.input,
      output: this.output,
      altScreen: options.altScreen ?? true,
      mouse: options.mouse ?? false,
    });
    this.inputReader = new InputReader(this.input);
    this.eventDispatcher = new EventDispatcher(this.document);

    /* Body acts as the viewport — enable scroll so content that
     * exceeds the terminal height can be scrolled rather than clipped. */
    this.document.body.style.overflow = 'scroll';

    this.wireCaretListeners();
    this.wireBodyScrollListener();
  }

  /**
   * Wires document-level listeners so the caret system automatically
   * creates/removes carets on focus transitions and handles editing keys.
   *
   * Supports both `[EDITABLE]` symbol-configured elements (system-managed)
   * and legacy `Editable` interface implementations (component-managed).
   */
  private wireCaretListeners(): void {
    this.document.body.addEventListener('focusin', ((event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;

      const config = this.getEditableConfig(target);

      if (config) {
        this.activateEditable(target, config);
        return;
      }

      if (this.isLegacyEditable(target)) {
        const editable = target as unknown as Editable;
        const caret = this.caretManager.createCaret(editable);

        if (
          'setCaret' in target &&
          typeof (target as Record<string, unknown>).setCaret === 'function'
        ) {
          (target as unknown as {setCaret(c: unknown): void}).setCaret(caret);
        }
      }
    }) as EventListener);

    this.document.body.addEventListener('focusout', ((event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;

      const config = this.getEditableConfig(target);

      if (config) {
        this.deactivateEditable(target, config);
        return;
      }

      if (this.isLegacyEditable(target)) {
        for (const caret of this.caretManager.getCarets()) {
          if (caret.target.getElement() === target) {
            this.caretManager.removeCaret(caret);
            break;
          }
        }

        if (
          'setCaret' in target &&
          typeof (target as Record<string, unknown>).setCaret === 'function'
        ) {
          (target as unknown as {setCaret(c: unknown): void}).setCaret(null);
        }
      }
    }) as EventListener);

    this.document.body.addEventListener('keydown', ((event: Event) => {
      const activeElement = this.document.activeElement;
      if (!activeElement) return;

      for (const caret of this.caretManager.getCarets()) {
        if (caret.target.getElement() === activeElement) {
          const config = this.getEditableConfig(activeElement);
          const stateForKey = config
            ? (activeElement as unknown as Partial<EditableStateElement>)[EDITABLE_STATE]
            : undefined;

          if (
            handleCaretKeyDown(caret, event as KeyboardEvent, {
              config: config ?? undefined,
              viewportWidth: stateForKey?.resolvedWidth,
              viewportHeight: stateForKey?.resolvedHeight,
              onClipboardWrite: (text) => {
                this.clipboardBuffer = text;
                this.writeToClipboard(text);
              },
              onClipboardRead: () => this.clipboardBuffer,
            })
          ) {
            if (config) {
              this.syncEditableRendering(activeElement, config);
            }

            return;
          }
        }
      }
    }) as EventListener);

    this.document.body.addEventListener('paste', ((event: Event) => {
      const target = this.document.activeElement;
      if (!target) return;

      const config = this.getEditableConfig(target);
      if (!config) return;

      const stateEl = target as unknown as Partial<EditableStateElement>;
      const state = stateEl[EDITABLE_STATE];
      if (!state || !state.caret) return;

      if (target.hasAttribute('disabled') || target.hasAttribute('readonly')) return;

      const clipboardEvent = event as import('../dom').ClipboardEvent;
      const text = clipboardEvent.clipboardData?.getData('text/plain') ?? '';

      if (text.length > 0) {
        state.caret.insertText(text);
        this.syncEditableRendering(target, config);
      }
    }) as EventListener);

    this.document.body.addEventListener('mousedown', ((event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;

      const config = this.getEditableConfig(target);
      if (!config) return;

      event.preventDefault();
      this.document.setActiveElement(target);

      const stateEl = target as unknown as Partial<EditableStateElement>;
      const state = stateEl[EDITABLE_STATE];
      if (!state || !state.caret) return;

      const mouseEvent = event as import('../dom').MouseEvent;
      const localX = mouseEvent.offsetX ?? 0;
      const shift = mouseEvent.shiftKey ?? false;

      const targetPos = this.hitTestCursorPosition(state, config, localX);

      if (shift) {
        state.caret.selectTo(targetPos);
      } else {
        state.caret.moveTo(targetPos);
      }

      this.syncEditableRendering(target, config);
    }) as EventListener);
  }

  /* ── [EDITABLE] system management ──────────────────────── */

  /**
   * Returns the `[EDITABLE]` configuration from an element, or null.
   */
  private getEditableConfig(element: Element): EditableConfiguration | null {
    const el = element as unknown as Partial<Record<typeof EDITABLE, EditableConfiguration>>;
    return el[EDITABLE] ?? null;
  }

  /**
   * Creates system-managed editable state when an `[EDITABLE]` element
   * receives focus.
   */
  private activateEditable(element: Element, config: EditableConfiguration): void {
    const valueAttr = config.valueAttribute;
    const initialValue = valueAttr ? (element.getAttribute(valueAttr) ?? '') : '';
    const graphemes = segmentGraphemes(initialValue);

    const state: EditableState = {
      graphemes,
      cursorPosition: graphemes.length,
      scrollX: 0,
      scrollY: 0,
      isFocused: true,
      valueAtFocus: initialValue,
      caret: null,
      resolvedWidth: config.intrinsicWidth(),
      resolvedHeight: config.intrinsicHeight(),
    };

    (element as unknown as EditableStateElement)[EDITABLE_STATE] = state;

    const editable = this.createEditableBridge(element, state, config);
    const caret = this.caretManager.createCaret(editable);
    state.caret = caret;

    this.syncEditableRendering(element, config);
  }

  /**
   * Tears down system-managed editable state when an `[EDITABLE]` element
   * loses focus.
   */
  private deactivateEditable(element: Element, config: EditableConfiguration): void {
    const stateEl = element as unknown as Partial<EditableStateElement>;
    const state = stateEl[EDITABLE_STATE];
    if (!state) return;

    const currentValue = state.graphemes.join('');

    for (const caret of this.caretManager.getCarets()) {
      if (caret.target.getElement() === element) {
        this.caretManager.removeCaret(caret);
        break;
      }
    }

    state.isFocused = false;
    state.caret = null;

    if (currentValue !== state.valueAtFocus) {
      element.dispatchEvent(new Event('change', {bubbles: true}));
    }

    this.syncEditableRendering(element, config);
  }

  /**
   * Creates an `Editable` bridge object that maps the system-managed state
   * to the interface expected by `Caret` and `CaretManager`.
   */
  private createEditableBridge(
    element: Element,
    state: EditableState,
    config: EditableConfiguration,
  ): Editable {
    const syncValue = () => this.syncEditableValue(element, state, config);
    const syncRendering = () => this.syncEditableRendering(element, config);
    const updateScroll = () => this.updateEditableScroll(element, state, config);

    return {
      getGraphemes: () => state.graphemes,
      getCursorPosition: () => state.cursorPosition,
      setCursorPosition: (pos: number) => {
        state.cursorPosition = Math.max(0, Math.min(pos, state.graphemes.length));
      },
      insertText: (text: string) => {
        const sanitized = config.multiLine ? text : text.replace(/[\n\r\t]/g, ' ');
        const newGraphemes = segmentGraphemes(sanitized);
        if (newGraphemes.length === 0) return;

        const maxLength = config.maxLength?.() ?? 0;

        if (maxLength > 0) {
          const available = maxLength - state.graphemes.length;
          if (available <= 0) return;
          if (newGraphemes.length > available) newGraphemes.length = available;
        }

        state.graphemes.splice(state.cursorPosition, 0, ...newGraphemes);
        state.cursorPosition += newGraphemes.length;
        syncValue();
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            data: sanitized,
            inputType: 'insertText',
          }),
        );
      },
      deleteRange: (start: number, end: number) => {
        state.graphemes.splice(start, end - start);
        state.cursorPosition = Math.min(state.cursorPosition, state.graphemes.length);
        syncValue();
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            data: null,
            inputType: 'deleteContentBackward',
          }),
        );
      },
      getEditableWidth: () => state.resolvedWidth,
      getScrollOffset: () => state.scrollX,
      getScrollY: () => state.scrollY,
      updateScroll: () => {
        updateScroll();
        syncRendering();
      },
      isReadonly: () => element.hasAttribute('readonly'),
      isDisabled: () => element.hasAttribute('disabled'),
      getElement: () => element,
    };
  }

  /**
   * Syncs the grapheme value back to the element's value attribute.
   */
  private syncEditableValue(
    element: Element,
    state: EditableState,
    config: EditableConfiguration,
  ): void {
    if (!config.valueAttribute) return;

    const value = state.graphemes.join('');
    const current = element.getAttribute(config.valueAttribute);

    if (current !== value) {
      element.setAttribute(config.valueAttribute, value);
    }
  }

  /**
   * Updates scroll offsets to keep the cursor visible within the viewport.
   */
  private updateEditableScroll(
    element: Element,
    state: EditableState,
    config: EditableConfiguration,
  ): void {
    if (config.multiLine) {
      this.updateVerticalScroll(element, state, config);
    } else {
      this.updateHorizontalScroll(state, config);
    }
  }

  /**
   * Horizontal scroll for single-line editables.
   */
  private updateHorizontalScroll(state: EditableState, _config: EditableConfiguration): void {
    const width = state.resolvedWidth;

    if (state.cursorPosition < state.scrollX) {
      state.scrollX = state.cursorPosition;
      return;
    }

    let visibleWidth = 0;
    let visibleEnd = state.scrollX;

    for (let i = state.scrollX; i < state.graphemes.length; i++) {
      const w = cellWidth(state.graphemes[i]!);
      if (visibleWidth + w > width) break;
      visibleWidth += w;
      visibleEnd = i + 1;
    }

    if (state.cursorPosition > visibleEnd) {
      let widthFromCursor = 0;
      let newOffset = state.cursorPosition;

      for (let i = state.cursorPosition - 1; i >= 0; i--) {
        const w = cellWidth(state.graphemes[i]!);
        if (widthFromCursor + w > width) break;
        widthFromCursor += w;
        newOffset = i;
      }

      state.scrollX = newOffset;
    }
  }

  /**
   * Vertical scroll for multi-line editables.
   */
  private updateVerticalScroll(
    _element: Element,
    state: EditableState,
    config: EditableConfiguration,
  ): void {
    const lines = computeVisualLines(state.graphemes, state.resolvedWidth, config.wordWrap);
    const cursorLine = findLineForCursor(lines, state.cursorPosition, state.graphemes);

    const viewportHeight = state.resolvedHeight;

    if (cursorLine < state.scrollY) {
      state.scrollY = cursorLine;
    } else if (cursorLine >= state.scrollY + viewportHeight) {
      state.scrollY = cursorLine - viewportHeight + 1;
    }
  }

  /**
   * Renders the visible text content for a system-managed editable element.
   */
  private syncEditableRendering(element: Element, config: EditableConfiguration): void {
    const stateEl = element as unknown as Partial<EditableStateElement>;
    const state = stateEl[EDITABLE_STATE];
    if (!state) return;

    const width = state.resolvedWidth;
    const height = state.resolvedHeight;

    if (state.graphemes.length === 0 && !state.isFocused) {
      const placeholder = config.placeholder?.() ?? '';

      if (config.multiLine) {
        element.textContent = this.padToViewport(placeholder, width, height);
      } else if (placeholder.length > 0) {
        element.textContent = this.truncateToWidth(placeholder, width);
      } else {
        element.textContent = ' '.repeat(width);
      }
      return;
    }

    if (config.multiLine) {
      this.renderMultiLine(element, state, config, width, height);
    } else {
      this.renderSingleLine(element, state, width);
    }
  }

  /**
   * Single-line rendering: shows graphemes from scrollX, padded to width.
   */
  private renderSingleLine(element: Element, state: EditableState, width: number): void {
    let output = '';
    let outputWidth = 0;

    for (let i = state.scrollX; i < state.graphemes.length; i++) {
      const grapheme = state.graphemes[i]!;
      const w = cellWidth(grapheme);
      if (outputWidth + w > width) break;
      output += grapheme;
      outputWidth += w;
    }

    if (outputWidth < width) {
      output += ' '.repeat(width - outputWidth);
    }

    element.textContent = output;
  }

  /**
   * Multi-line rendering: shows visible lines from scrollY, padded to viewport.
   */
  private renderMultiLine(
    element: Element,
    state: EditableState,
    config: EditableConfiguration,
    width: number,
    height: number,
  ): void {
    const lines = computeVisualLines(state.graphemes, width, config.wordWrap);
    const renderedLines: string[] = [];

    for (let row = 0; row < height; row++) {
      const lineIndex = state.scrollY + row;

      if (lineIndex >= lines.length) {
        renderedLines.push(' '.repeat(width));
        continue;
      }

      const line = lines[lineIndex]!;
      let lineOutput = '';
      let lineWidth = 0;

      for (let i = line.start; i < line.end && i < state.graphemes.length; i++) {
        const grapheme = state.graphemes[i]!;
        if (grapheme === '\n') continue;
        const w = cellWidth(grapheme);
        if (lineWidth + w > width) break;
        lineOutput += grapheme;
        lineWidth += w;
      }

      if (lineWidth < width) {
        lineOutput += ' '.repeat(width - lineWidth);
      }

      renderedLines.push(lineOutput);
    }

    element.textContent = renderedLines.join('\n');
  }

  /**
   * Pads text to fill a multi-line viewport (width × height), preserving
   * existing content on each line.
   */
  private padToViewport(text: string, width: number, height: number): string {
    const lines = text.length > 0 ? text.split('\n') : [];
    const padded: string[] = [];

    for (let row = 0; row < height; row++) {
      const line = lines[row] ?? '';
      const padAmount = Math.max(0, width - line.length);
      padded.push(line + ' '.repeat(padAmount));
    }

    return padded.join('\n');
  }

  /**
   * Truncates a string to fit within a given cell width, padding with spaces.
   */
  private truncateToWidth(text: string, maxWidth: number): string {
    const graphemes = segmentGraphemes(text);
    let result = '';
    let width = 0;

    for (const grapheme of graphemes) {
      const w = cellWidth(grapheme);
      if (width + w > maxWidth) break;
      result += grapheme;
      width += w;
    }

    if (width < maxWidth) {
      result += ' '.repeat(maxWidth - width);
    }

    return result;
  }

  /**
   * Maps a mouse offsetX to a flat grapheme index for cursor positioning.
   */
  /**
   * Wires a body-level keydown listener that scrolls the viewport
   * when arrow keys or Page Up/Down are pressed and not consumed
   * by a focused editable element.
   */
  private wireBodyScrollListener(): void {
    const SCROLL_LINE = 1;
    const SCROLL_PAGE_FACTOR = 0.8;

    this.document.body.addEventListener('keydown', ((event: Event) => {
      const ke = event as KeyboardEvent;

      /* Only scroll when no editable is focused */
      const activeElement = this.document.activeElement;

      if (activeElement && activeElement !== this.document.body) {
        /* Check if the active element is an editable that handles arrow keys */
        const config = this.getEditableConfig(activeElement);

        if (config) return;
      }

      const body = this.document.body as typeof this.document.body & {scrollTop?: number};
      const currentScroll = body.scrollTop ?? 0;
      const pageHeight = Math.max(1, Math.floor(this.getRows() * SCROLL_PAGE_FACTOR));

      let delta = 0;

      switch (ke.key) {
        case 'ArrowUp':
          delta = -SCROLL_LINE;
          break;
        case 'ArrowDown':
          delta = SCROLL_LINE;
          break;
        case 'PageUp':
          delta = -pageHeight;
          break;
        case 'PageDown':
          delta = pageHeight;
          break;
        default:
          return;
      }

      body.scrollTop = Math.max(0, currentScroll + delta);
      event.preventDefault();
    }) as EventListener);
  }

  /**
   * Updates resolved viewport dimensions for all active editables
   * from their layout boxes' content areas.
   */
  private resolveEditableViewports(layoutRoot: import('../layout/types').LayoutBox | null): void {
    if (!layoutRoot) return;

    for (const caret of this.caretManager.getCarets()) {
      const element = caret.target.getElement();
      const stateEl = element as unknown as Partial<EditableStateElement>;
      const state = stateEl[EDITABLE_STATE];
      if (!state) continue;

      const box = this.findLayoutBox(layoutRoot, element);
      if (!box) continue;

      state.resolvedWidth = box.contentWidth;
      state.resolvedHeight = box.contentHeight;
    }
  }

  /**
   * Finds the layout box for a DOM element by walking the layout tree.
   */
  private findLayoutBox(
    box: import('../layout/types').LayoutBox,
    element: Element,
  ): import('../layout/types').LayoutBox | null {
    if (box.element === element) return box;

    for (const child of box.children) {
      const found = this.findLayoutBox(child, element);
      if (found) return found;
    }

    return null;
  }

  private hitTestCursorPosition(
    state: EditableState,
    config: EditableConfiguration,
    localX: number,
  ): number {
    if (config.multiLine) {
      // TODO: multi-line mouse positioning needs offsetY + line mapping
      return state.cursorPosition;
    }

    let currentWidth = 0;
    let targetIndex = state.scrollX;

    for (let i = state.scrollX; i < state.graphemes.length; i++) {
      const w = cellWidth(state.graphemes[i]!);
      if (currentWidth + w / 2 >= localX) break;
      currentWidth += w;
      targetIndex = i + 1;
    }

    return targetIndex;
  }

  /**
   * Checks whether a DOM element implements the legacy `Editable` interface.
   */
  private isLegacyEditable(element: Element): boolean {
    return (
      typeof (element as unknown as Partial<Editable>).getGraphemes === 'function' &&
      typeof (element as unknown as Partial<Editable>).getCursorPosition === 'function'
    );
  }

  /**
   * Writes text to the system clipboard via the OSC 52 escape sequence.
   *
   * @param text - The text to copy to the clipboard.
   */
  private writeToClipboard(text: string): void {
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    this.output.write(`\u001B]52;c;${encoded}\u0007`);
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
    void this.terminalManager.detectCapabilities().then(() => {
      if (!this.running) {
        return;
      }

      this.styleEngine.markAllDirty();
      this.renderFrame();
    });
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
    const now = Date.now();

    this.advanceFrameAwareNodes(now);
    this.caretManager.tick(now);

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
    this.resolveEditableViewports(layout);
    const capabilities = this.terminalManager.getCapabilities();

    this.renderer.setSynchronizedOutputEnabled(capabilities.synchronizedOutput);
    this.renderer.setColorProfile(capabilities.colorProfile);

    const caretOverlays = this.caretManager.getOverlays(layout);
    const output = this.renderer.render(layout, caretOverlays);

    if (output.length > 0) {
      this.output.write(output);
    }
  }

  private advanceFrameAwareNodes(timestamp: number): void {
    for (const node of selfAndDescendants(this.document.body)) {
      (node as Partial<TerminalFrameAware>).onTerminalFrame?.(timestamp);
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
