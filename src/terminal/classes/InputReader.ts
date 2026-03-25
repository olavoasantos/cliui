import type {TerminalInputEvent, TerminalKeyEvent, TerminalReadableInput} from '../types';

const ESC = '\u001B';
const BRACKETED_PASTE_START = `${ESC}[200~`;
const BRACKETED_PASTE_END = `${ESC}[201~`;
const SS3_FUNCTION_KEYS: Record<string, string> = {
  P: 'F1',
  Q: 'F2',
  R: 'F3',
  S: 'F4',
};
const CSI_TILDE_KEYS: Record<string, string> = {
  '1': 'Home',
  '2': 'Insert',
  '3': 'Delete',
  '4': 'End',
  '5': 'PageUp',
  '6': 'PageDown',
  '7': 'Home',
  '8': 'End',
  '15': 'F5',
  '17': 'F6',
  '18': 'F7',
  '19': 'F8',
  '20': 'F9',
  '21': 'F10',
  '23': 'F11',
  '24': 'F12',
};
const CSI_FINAL_KEYS: Record<string, string> = {
  A: 'ArrowUp',
  B: 'ArrowDown',
  C: 'ArrowRight',
  D: 'ArrowLeft',
  F: 'End',
  H: 'Home',
};

/**
 * Reads raw terminal bytes and parses them into structured input events.
 *
 * The reader can parse direct chunks synchronously via {@link parse} and can
 * also subscribe to a readable input stream via {@link start}. Escape-sequence
 * parsing is buffered so partial chunks are preserved until a full key or paste
 * event is available.
 */
export class InputReader {
  private input: TerminalReadableInput;
  private pending = '';
  private readingPaste = false;
  private pasteBuffer = '';
  private listener?: (event: TerminalInputEvent) => void;
  private boundDataListener = (chunk: Buffer | string): void => {
    for (const event of this.parse(chunk)) {
      this.listener?.(event);
    }
  };

  /**
   * Creates an input reader bound to a terminal-readable stream.
   *
   * @param input - Raw terminal input stream.
   */
  constructor(input: TerminalReadableInput) {
    this.input = input;
  }

  /**
   * Starts listening to the configured input stream.
   *
   * @param listener - Callback invoked for each parsed terminal input event.
   */
  start(listener: (event: TerminalInputEvent) => void): void {
    if (this.listener !== undefined) {
      return;
    }

    this.listener = listener;
    this.input.on?.('data', this.boundDataListener);
    this.input.resume?.();
  }

  /**
   * Stops listening to the configured input stream.
   */
  stop(): void {
    if (this.listener === undefined) {
      return;
    }

    this.input.off?.('data', this.boundDataListener);
    this.input.pause?.();
    this.listener = undefined;
  }

  /**
   * Parses one chunk of terminal input into structured events.
   *
   * Incomplete escape sequences are buffered internally until a future chunk
   * completes them.
   *
   * @param chunk - Raw input bytes or string data.
   * @returns Parsed key or paste events.
   */
  parse(chunk: Buffer | string): TerminalInputEvent[] {
    this.pending += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

    const events: TerminalInputEvent[] = [];

    while (this.pending.length > 0) {
      if (this.readingPaste) {
        const pasteEndIndex = this.pending.indexOf(BRACKETED_PASTE_END);

        if (pasteEndIndex === -1) {
          this.pasteBuffer += this.pending;
          this.pending = '';
          break;
        }

        this.pasteBuffer += this.pending.slice(0, pasteEndIndex);
        events.push({type: 'paste', text: this.pasteBuffer});
        this.pending = this.pending.slice(pasteEndIndex + BRACKETED_PASTE_END.length);
        this.pasteBuffer = '';
        this.readingPaste = false;
        continue;
      }

      if (this.pending.startsWith(BRACKETED_PASTE_START)) {
        this.pending = this.pending.slice(BRACKETED_PASTE_START.length);
        this.readingPaste = true;
        this.pasteBuffer = '';
        continue;
      }

      const event = this.readNextEvent();

      if (event === null) {
        break;
      }

      events.push(event);
    }

    return events;
  }

  private readNextEvent(): TerminalInputEvent | null {
    const first = this.pending[0]!;

    if (first !== ESC) {
      this.pending = this.pending.slice(1);
      return this.parseSimpleKey(first);
    }

    if (this.pending.length === 1) {
      this.pending = '';
      return this.createKeyEvent('Escape', 'Escape');
    }

    const second = this.pending[1]!;

    if (second === '[') {
      const csiEvent = this.readCsiSequence();

      if (csiEvent === undefined) {
        return null;
      }

      return csiEvent;
    }

    if (second === 'O') {
      const ss3Event = this.readSs3Sequence();

      if (ss3Event === undefined) {
        return null;
      }

      return ss3Event;
    }

    this.pending = this.pending.slice(2);
    return this.parseSimpleKey(second, {alt: true});
  }

  private readCsiSequence(): TerminalInputEvent | null | undefined {
    const match = this.pending.match(/^\u001B\[([0-9;]*)([~A-Za-z])?/);

    if (match === null) {
      return null;
    }

    const parameterText = match[1] ?? '';
    const final = match[2];

    if (final === undefined) {
      return undefined;
    }

    this.pending = this.pending.slice(match[0].length);

    if (final === '~') {
      const parameters = parameterText.split(';').filter((value) => value.length > 0);
      const primary = parameters[0] ?? '';
      const key = CSI_TILDE_KEYS[primary];

      if (key === undefined) {
        return this.createKeyEvent('Escape', 'Escape');
      }

      return this.createKeyEvent(key, key, this.parseModifier(parameters[1]));
    }

    const key = CSI_FINAL_KEYS[final];

    if (key === undefined) {
      return this.createKeyEvent('Escape', 'Escape');
    }

    const parameters = parameterText.split(';').filter((value) => value.length > 0);
    const modifierParameter = parameters.length > 1 ? parameters.at(-1) : undefined;

    return this.createKeyEvent(key, key, this.parseModifier(modifierParameter));
  }

  private readSs3Sequence(): TerminalInputEvent | null | undefined {
    if (this.pending.length < 3) {
      return undefined;
    }

    const final = this.pending[2]!;

    this.pending = this.pending.slice(3);

    const key = SS3_FUNCTION_KEYS[final];

    if (key !== undefined) {
      return this.createKeyEvent(key, key);
    }

    return this.createKeyEvent('Escape', 'Escape');
  }

  private parseSimpleKey(
    char: string,
    modifiers: Partial<Pick<TerminalKeyEvent, 'ctrl' | 'alt' | 'shift'>> = {},
  ): TerminalKeyEvent {
    switch (char) {
      case '\r':
      case '\n':
        return this.createKeyEvent('Enter', 'Enter', modifiers);
      case '\t':
        return this.createKeyEvent('Tab', 'Tab', modifiers);
      case '\b':
      case '\u007F':
        return this.createKeyEvent('Backspace', 'Backspace', modifiers);
      case ' ':
        return this.createKeyEvent(' ', 'Space', modifiers);
      default:
        break;
    }

    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint >= 1 && codePoint <= 26) {
      const key = String.fromCharCode(codePoint + 96);
      return this.createKeyEvent(key, `Key${key.toUpperCase()}`, {
        ...modifiers,
        ctrl: true,
      });
    }

    const normalizedShift = modifiers.shift ?? this.isShiftedPrintable(char);

    if (/^[a-z]$/i.test(char)) {
      return this.createKeyEvent(char.toLowerCase(), `Key${char.toUpperCase()}`, {
        ...modifiers,
        shift: normalizedShift,
      });
    }

    if (/^[0-9]$/.test(char)) {
      return this.createKeyEvent(char, `Digit${char}`, {
        ...modifiers,
        shift: normalizedShift,
      });
    }

    return this.createKeyEvent(char, `Key${char.toUpperCase()}`, {
      ...modifiers,
      shift: normalizedShift,
    });
  }

  private parseModifier(
    parameter: string | undefined,
  ): Pick<TerminalKeyEvent, 'ctrl' | 'alt' | 'shift'> {
    const value = Number.parseInt(parameter ?? '1', 10);

    if (!Number.isFinite(value) || value <= 1) {
      return {ctrl: false, alt: false, shift: false};
    }

    const encoded = value - 1;

    return {
      shift: (encoded & 1) !== 0,
      alt: (encoded & 2) !== 0,
      ctrl: (encoded & 4) !== 0,
    };
  }

  private createKeyEvent(
    key: string,
    code: string,
    modifiers: Partial<Pick<TerminalKeyEvent, 'ctrl' | 'alt' | 'shift'>> = {},
  ): TerminalKeyEvent {
    return {
      type: 'key',
      key,
      code,
      ctrl: modifiers.ctrl ?? false,
      alt: modifiers.alt ?? false,
      shift: modifiers.shift ?? false,
    };
  }

  private isShiftedPrintable(char: string): boolean {
    return char.length === 1 && char >= 'A' && char <= 'Z';
  }
}
