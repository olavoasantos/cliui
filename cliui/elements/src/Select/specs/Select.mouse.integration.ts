import {afterEach, describe, expect, it, vi} from 'vitest';

import {Terminal} from '@cliui/terminal';
import {MouseEvent} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Option} from '../../Option/component';
import {Select} from '../component';

import type {Element} from '@cliui/dom';
import type {TerminalReadableInput} from '@cliui/terminal';

function createOutput(cols = 40, rows = 12) {
  return {
    stream: {
      columns: cols,
      rows,
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

describe('Select mouse interactions via EventDispatcher', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking an option does not blur the select', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: true,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    terminal.window.customElements.define(
      Select.tagName,
      Select as unknown as CustomElementConstructor,
    );
    terminal.window.customElements.define(
      Option.tagName,
      Option as unknown as CustomElementConstructor,
    );

    const style = terminal.document.createElement('style');
    style.textContent = `
      ui-select { width: 20; }
      ui-option { color: #e5e7eb; }
    `;
    terminal.document.head.appendChild(style);

    const select = terminal.document.createElement('select') as Select;
    select.setAttribute('value', 'a');

    const optA = terminal.document.createElement('option') as Option;
    optA.setAttribute('value', 'a');
    optA.textContent = 'Alpha';

    const optB = terminal.document.createElement('option') as Option;
    optB.setAttribute('value', 'b');
    optB.textContent = 'Beta';

    select.appendChild(optA);
    select.appendChild(optB);
    terminal.document.body.appendChild(select);

    await terminal.run();

    /* Focus select and open dropdown */
    terminal.document.setActiveElement(select as unknown as Element);
    select.open();
    expect(select.isOpen()).toBe(true);

    /* Find the Beta option */
    const listbox = select.childNodes[1] as Element;
    let betaOpt: Option | null = null;

    for (let i = 0; i < listbox.childNodes.length; i++) {
      const child = listbox.childNodes[i] as unknown as Option;

      if (child.getValue?.() === 'b') {
        betaOpt = child;
        break;
      }
    }

    expect(betaOpt).not.toBeNull();

    /* Simulate mousedown on option (what EventDispatcher does on press) */
    betaOpt!.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    );

    /* Select should still be focused — the mousedown should NOT blur it
     * because handleMouseFocus walks up to find the tabindex-ed select */
    expect(terminal.document.activeElement).toBe(select as unknown as Element);
    expect(select.isOpen()).toBe(true);

    /* Now click to select the option */
    betaOpt!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(select.getAttribute('value')).toBe('b');
    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });

  it('clicking a focused open select closes it without reopening', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const output = createOutput();
    const terminal = new Terminal({
      altScreen: false,
      mouse: true,
      fps: 10,
      output: output.stream,
      input: stdin,
    });

    terminal.window.customElements.define(
      Select.tagName,
      Select as unknown as CustomElementConstructor,
    );
    terminal.window.customElements.define(
      Option.tagName,
      Option as unknown as CustomElementConstructor,
    );

    const select = terminal.document.createElement('select') as Select;
    select.setAttribute('value', 'a');

    const opt = terminal.document.createElement('option') as Option;
    opt.setAttribute('value', 'a');
    opt.textContent = 'Alpha';

    select.appendChild(opt);
    terminal.document.body.appendChild(select);

    await terminal.run();

    terminal.document.setActiveElement(select as unknown as Element);
    select.open();
    expect(select.isOpen()).toBe(true);

    /* Click on the trigger area — mousedown then click */
    const trigger = select.childNodes[0] as Element;
    trigger.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    );
    trigger.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });
});
