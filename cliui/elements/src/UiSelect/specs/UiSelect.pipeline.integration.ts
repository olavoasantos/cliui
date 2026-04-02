import {afterEach, describe, expect, it, vi} from 'vitest';
import {Terminal} from '@cliui/terminal';
import {Event, KeyboardEvent} from '@cliui/dom';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../component';

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

const FRUITS = [
  {value: 'apple', label: 'Apple'},
  {value: 'banana', label: 'Banana'},
  {value: 'cherry', label: 'Cherry'},
];

function setupTerminal() {
  const output = createOutput();
  const terminal = new Terminal({
    altScreen: false,
    mouse: false,
    fps: 10,
    output: output.stream,
    input: stdin,
  });

  terminal.window.customElements.define(
    UiSelect.tagName,
    UiSelect as unknown as CustomElementConstructor,
  );
  terminal.window.customElements.define(
    UiOption.tagName,
    UiOption as unknown as CustomElementConstructor,
  );

  const style = terminal.document.createElement('style');
  style.textContent = `
    ui-select { color: #e5e7eb; background-color: #1e293b; width: 20; }
    ui-option { color: #e5e7eb; }
    ui-option[highlighted] { background-color: #7c3aed; }
  `;
  terminal.document.head.appendChild(style);

  const select = terminal.document.createElement('ui-select') as UiSelect;
  select.setAttribute('value', 'apple');

  for (const data of FRUITS) {
    const opt = terminal.document.createElement('ui-option') as UiOption;
    opt.setAttribute('value', data.value);
    opt.textContent = data.label;
    select.appendChild(opt);
  }

  terminal.document.body.appendChild(select);

  const other = terminal.document.createElement('div');
  other.setAttribute('tabindex', '1');
  other.textContent = 'Other';
  terminal.document.body.appendChild(other);

  return {terminal, select, other};
}

describe('UiSelect full pipeline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('click-to-close: clicking a focused open select closes dropdown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const {terminal, select} = setupTerminal();

    await terminal.run();

    terminal.document.setActiveElement(select as unknown as Element);

    /* Open via Enter */
    select.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Enter'}),
    );
    expect(select.isOpen()).toBe(true);

    /* Click to close — simulate what the user does */
    select.dispatchEvent(new Event('click', {bubbles: true}));
    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });

  it('tab-close: tabbing away from open select closes dropdown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const {terminal, select, other} = setupTerminal();

    await terminal.run();

    terminal.document.setActiveElement(select as unknown as Element);
    select.open();
    expect(select.isOpen()).toBe(true);

    /* Tab away */
    terminal.document.setActiveElement(other);
    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });

  it('option-click: clicking an option selects and closes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const {terminal, select} = setupTerminal();

    await terminal.run();

    terminal.document.setActiveElement(select as unknown as Element);
    select.open();

    /* Find the cherry option in the DOM */
    const listbox = select.childNodes[1] as Element;
    let cherryOpt: UiOption | null = null;

    for (let i = 0; i < listbox.childNodes.length; i++) {
      const child = listbox.childNodes[i] as unknown as UiOption;
      if (child.getValue?.() === 'cherry') {
        cherryOpt = child;
        break;
      }
    }

    expect(cherryOpt).not.toBeNull();

    /* Simulate mousedown + click (what EventDispatcher does) */
    cherryOpt!.dispatchEvent(new Event('mousedown', {bubbles: true, cancelable: true}));
    /* Dropdown should still be open after mousedown */
    expect(select.isOpen()).toBe(true);

    cherryOpt!.dispatchEvent(new Event('click', {bubbles: true}));
    expect(select.getAttribute('value')).toBe('cherry');
    expect(select.isOpen()).toBe(false);

    terminal.exit();
  });
});
