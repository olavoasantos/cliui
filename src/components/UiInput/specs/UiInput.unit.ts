import {describe, expect, it} from 'vitest';

import {ClipboardEvent, Event, KeyboardEvent, Window} from '../../../dom';
import {UiInput} from '../component';
import {UI_INPUT_CURSOR_CHAR} from '../constants';

import type {KeyboardEventInit} from '../../../dom';

function createInput(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
): {window: Window; input: UiInput} {
  window.customElements.define(UiInput.tagName, UiInput as unknown as CustomElementConstructor);
  const input = window.document.createElement('ui-input') as UiInput;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        input.setAttribute(name, '');
      }
    } else {
      input.setAttribute(name, value);
    }
  }

  window.document.body.appendChild(input);

  return {window, input};
}

function typeKey(input: UiInput, key: string, options: Partial<KeyboardEventInit> = {}): void {
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...options,
    }),
  );
}

function focusInput(input: UiInput): void {
  input.dispatchEvent(new Event('focus'));
}

function blurInput(input: UiInput): void {
  input.dispatchEvent(new Event('blur'));
}

describe('UiInput', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiInput.tagName, UiInput as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-input')).toBe(
      UiInput as unknown as CustomElementConstructor,
    );
  });

  it('renders an empty field with spaces by default', () => {
    const {input} = createInput();

    expect(input.textContent).toBe(' '.repeat(20));
  });

  it('renders placeholder text when value is empty and unfocused', () => {
    const {input} = createInput(undefined, {placeholder: 'Type here...'});

    expect(input.textContent).toContain('Type here...');
  });

  it('renders cursor when focused and empty', () => {
    const {input} = createInput();

    focusInput(input);

    expect(input.textContent).toContain(UI_INPUT_CURSOR_CHAR);
  });

  it('inserts characters at cursor position', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'h');
    typeKey(input, 'i');

    expect(input.getAttribute('value')).toBe('hi');
  });

  it('renders typed text with cursor', () => {
    const {input} = createInput(undefined, {width: '10'});

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');

    expect(input.textContent).toContain('ab');
    expect(input.textContent).toContain(UI_INPUT_CURSOR_CHAR);
  });

  it('handles backspace', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'Backspace');

    expect(input.getAttribute('value')).toBe('ab');
  });

  it('handles delete', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'Home');
    typeKey(input, 'Delete');

    expect(input.getAttribute('value')).toBe('bc');
  });

  it('moves cursor left and right', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'ArrowLeft');
    typeKey(input, 'x');

    expect(input.getAttribute('value')).toBe('axb');
  });

  it('moves cursor to start with Home', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'Home');
    typeKey(input, 'x');

    expect(input.getAttribute('value')).toBe('xab');
  });

  it('moves cursor to end with End', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'Home');
    typeKey(input, 'End');
    typeKey(input, 'x');

    expect(input.getAttribute('value')).toBe('abx');
  });

  it('ignores input when disabled', () => {
    const {input} = createInput(undefined, {disabled: true});

    focusInput(input);
    typeKey(input, 'a');

    expect(input.getAttribute('value')).toBeNull();
  });

  it('allows cursor movement but not editing when readonly', () => {
    const {input} = createInput(undefined, {readonly: true, value: 'abc'});

    focusInput(input);
    typeKey(input, 'x');
    typeKey(input, 'Backspace');

    expect(input.getAttribute('value')).toBe('abc');
  });

  it('respects maxlength', () => {
    const {input} = createInput(undefined, {maxlength: '3'});

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'd');

    expect(input.getAttribute('value')).toBe('abc');
  });

  it('dispatches input events on each edit', () => {
    const {input} = createInput();
    const events: Event[] = [];

    input.addEventListener('input', ((event: Event) => {
      events.push(event);
    }) as EventListener);

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'Backspace');

    expect(events).toHaveLength(2);
  });

  it('dispatches change event on blur when value changed', () => {
    const {input} = createInput();
    const events: Event[] = [];

    input.addEventListener('change', ((event: Event) => {
      events.push(event);
    }) as EventListener);

    focusInput(input);
    typeKey(input, 'a');
    blurInput(input);

    expect(events).toHaveLength(1);
  });

  it('does not dispatch change event on blur when value unchanged', () => {
    const {input} = createInput();
    const events: Event[] = [];

    input.addEventListener('change', ((event: Event) => {
      events.push(event);
    }) as EventListener);

    focusInput(input);
    blurInput(input);

    expect(events).toHaveLength(0);
  });

  it('handles paste events', () => {
    const {input} = createInput();
    const clipboardData = {
      getData: (type: string): string => (type === 'text/plain' ? 'pasted' : ''),
    } as DataTransfer;

    focusInput(input);
    input.dispatchEvent(
      new ClipboardEvent('paste', {bubbles: true, cancelable: true, clipboardData}),
    );

    expect(input.getAttribute('value')).toBe('pasted');
  });

  it('renders initial value from attribute', () => {
    const {input} = createInput(undefined, {value: 'hello', width: '10'});

    expect(input.textContent).toContain('hello');
  });

  it('applies custom width', () => {
    const {input} = createInput(undefined, {width: '5'});

    expect(input.textContent?.length).toBe(5);
  });

  it('handles horizontal scrolling when text exceeds width', () => {
    const {input} = createInput(undefined, {width: '5'});

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'd');
    typeKey(input, 'e');
    typeKey(input, 'f');

    expect(input.getAttribute('value')).toBe('abcdef');
    expect(input.textContent?.length).toBe(5);
  });

  it('ignores control key combinations for text insertion', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a', {ctrlKey: true});

    expect(input.getAttribute('value')).toBeNull();
  });

  it('deletes word backward with Alt+Backspace', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'h');
    typeKey(input, 'e');
    typeKey(input, 'l');
    typeKey(input, 'l');
    typeKey(input, 'o');
    typeKey(input, ' ');
    typeKey(input, 'w');
    typeKey(input, 'o');
    typeKey(input, 'r');
    typeKey(input, 'l');
    typeKey(input, 'd');
    typeKey(input, 'Backspace', {altKey: true});

    expect(input.getAttribute('value')).toBe('hello ');
  });

  it('deletes word forward with Alt+Delete', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'h');
    typeKey(input, 'e');
    typeKey(input, 'l');
    typeKey(input, 'l');
    typeKey(input, 'o');
    typeKey(input, ' ');
    typeKey(input, 'w');
    typeKey(input, 'o');
    typeKey(input, 'r');
    typeKey(input, 'l');
    typeKey(input, 'd');
    typeKey(input, 'Home');
    typeKey(input, 'Delete', {altKey: true});

    expect(input.getAttribute('value')).toBe('world');
  });

  it('deletes to line start with Ctrl+U', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'u', {ctrlKey: true});

    expect(input.getAttribute('value')).toBe('');
  });

  it('deletes to line end with Ctrl+K', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'a');
    typeKey(input, 'b');
    typeKey(input, 'c');
    typeKey(input, 'Home');
    typeKey(input, 'k', {ctrlKey: true});

    expect(input.getAttribute('value')).toBe('');
  });

  it('blurs on Escape', () => {
    const {window, input} = createInput();
    const events: Event[] = [];

    input.addEventListener('change', ((event: Event) => {
      events.push(event);
    }) as EventListener);

    window.document.setActiveElement(input);
    typeKey(input, 'a');
    typeKey(input, 'Escape');

    expect(events).toHaveLength(1);
    expect(window.document.activeElement).not.toBe(input);
  });

  it('focuses on mousedown', () => {
    const {window, input} = createInput();
    const other = window.document.createElement('div');
    window.document.body.appendChild(other);

    window.document.setActiveElement(other);

    input.dispatchEvent(new Event('mousedown'));

    expect(window.document.activeElement).toBe(input);
  });

  it('moves cursor by word with Alt+Arrow', () => {
    const {input} = createInput();

    focusInput(input);
    typeKey(input, 'h');
    typeKey(input, 'i');
    typeKey(input, ' ');
    typeKey(input, 'y');
    typeKey(input, 'o');
    typeKey(input, 'ArrowLeft', {altKey: true});
    typeKey(input, 'x');

    expect(input.getAttribute('value')).toBe('hi xyo');
  });

  it('toggles cursor blink via onTerminalFrame', () => {
    const {input} = createInput(undefined, {width: '5'});

    focusInput(input);

    const initialText = input.textContent;
    expect(initialText).toContain(UI_INPUT_CURSOR_CHAR);

    input.onTerminalFrame(0);
    input.onTerminalFrame(600);

    const afterBlink = input.textContent;
    expect(afterBlink).not.toContain(UI_INPUT_CURSOR_CHAR);

    input.onTerminalFrame(1200);

    const afterUnblink = input.textContent;
    expect(afterUnblink).toContain(UI_INPUT_CURSOR_CHAR);
  });
});
