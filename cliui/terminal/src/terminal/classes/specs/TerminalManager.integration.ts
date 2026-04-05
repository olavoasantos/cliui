import {describe, expect, it} from 'vitest';

import {TerminalManager} from '../TerminalManager';

function createOutput(colorDepth = 24): {
  stream: {
    getColorDepth(): number;
    write(chunk: string): boolean;
  };
  read(): string;
} {
  let value = '';

  return {
    stream: {
      getColorDepth() {
        return colorDepth;
      },
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

function createInput(): {
  stream: {
    setRawMode(enabled: boolean): void;
    on(event: 'data', listener: (chunk: Buffer | string) => void): void;
    off(event: 'data', listener: (chunk: Buffer | string) => void): void;
  };
  emit(chunk: Buffer | string): void;
  rawModes: boolean[];
} {
  const listeners = new Set<(chunk: Buffer | string) => void>();
  const rawModes: boolean[] = [];

  return {
    stream: {
      setRawMode(enabled: boolean) {
        rawModes.push(enabled);
      },
      on(event: 'data', listener: (chunk: Buffer | string) => void) {
        if (event === 'data') {
          listeners.add(listener);
        }
      },
      off(event: 'data', listener: (chunk: Buffer | string) => void) {
        if (event === 'data') {
          listeners.delete(listener);
        }
      },
    },
    emit(chunk: Buffer | string) {
      for (const listener of listeners) {
        listener(chunk);
      }
    },
    rawModes,
  };
}

describe('TerminalManager integration', () => {
  it('enables terminal modes, negotiates capabilities, and restores terminal state on shutdown', async () => {
    const input = createInput();
    const output = createOutput(8);
    const manager = new TerminalManager({
      input: input.stream,
      output: output.stream,
      altScreen: true,
      mouse: true,
    });

    manager.start();

    const detection = manager.detectCapabilities();

    input.emit(Buffer.from('\u001B[?2027;0$y', 'utf8'));
    input.emit(Buffer.from('\u001B[?2026;2$y', 'utf8'));
    input.emit(Buffer.from('\u001B[?2027;1$y', 'utf8'));

    await detection;
    manager.stop();

    expect(input.rawModes).toEqual([true, false]);
    expect(manager.getCapabilities()).toEqual({
      colorProfile: 'ansi256',
      synchronizedOutput: true,
      unicodeWidth: false,
      graphicsProtocol: 'none',
    });
    expect(output.read()).toBe(
      '\u001B[?1049h\u001B[?25l\u001B[?1003h\u001B[?1006h\u001B[?1004h\u001B[?2004h' +
        '\u001B[?2026$p\u001B[?2027$p' +
        '\u001B_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\u001B\\' +
        '\u001B[?2004l\u001B[?1004l\u001B[?1006l\u001B[?1003l\u001B[?25h\u001B[0m\u001B[?1049l',
    );
  });
});
