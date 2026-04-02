import type {CustomElementConstructor} from '@cliui/dom';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {UiCodeblock} from '../component';

import type {TerminalReadableInput} from '@cliui/terminal';

function createOutput() {
  return {
    stream: {
      columns: 60,
      rows: 20,
      write(_chunk: string) {
        return true;
      },
    },
  };
}

function createStdin(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    off: vi.fn((_event: 'data', _listener: (chunk: Buffer | string) => void) => stdin),
    resume: vi.fn(),
    pause: vi.fn(),
  } as unknown as TerminalReadableInput;
}

const stdin = createStdin();

describe('UiCodeblock integration', () => {
  afterEach(() => {
    vi.useRealTimers();
    UiCodeblock.resetHighlighter();
  });

  it('renders plain code in a Terminal context', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    terminal.window.customElements.define(
      UiCodeblock.tagName,
      UiCodeblock as unknown as CustomElementConstructor,
    );

    const codeblock = terminal.document.createElement('ui-codeblock') as UiCodeblock;
    codeblock.textContent = 'hello\nworld';
    terminal.document.body.appendChild(codeblock);

    await terminal.run();

    expect(codeblock.getCode()).toBe('hello\nworld');
    expect(codeblock.childNodes.length).toBe(2);

    terminal.exit();
  });

  it('renders highlighted code after loading Shiki', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const js = (await import('shiki/langs/javascript.mjs')).default;
    const nord = (await import('shiki/themes/nord.mjs')).default;
    await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: false,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    terminal.window.customElements.define(
      UiCodeblock.tagName,
      UiCodeblock as unknown as CustomElementConstructor,
    );

    const codeblock = terminal.document.createElement('ui-codeblock') as UiCodeblock;
    codeblock.setAttribute('language', 'javascript');
    codeblock.setAttribute('theme', 'nord');
    codeblock.textContent = 'const x = 1;';
    terminal.document.body.appendChild(codeblock);

    await terminal.run();

    /* Verify background color was applied from theme */
    const bg = codeblock.style.getPropertyValue('background-color');
    expect(bg).toBeTruthy();

    terminal.exit();
  });
});
