import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {EDITABLE} from '@cliui/terminal';
import {Input} from '../component';

import type {EditableConfiguration} from '@cliui/terminal';

function createInput(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
): {window: Window; input: Input} {
  window.customElements.define(Input.tagName, Input as unknown as CustomElementConstructor);
  const input = window.document.createElement('input') as Input;

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

describe('Input', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Input.tagName, Input as unknown as CustomElementConstructor);

    expect(window.customElements.get('input')).toBe(Input as unknown as CustomElementConstructor);
  });

  it('carries an [EDITABLE] configuration', () => {
    const {input} = createInput();
    const config = (input as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config).toBeDefined();
    expect(config.intrinsicWidth()).toBe(20);
    expect(config.intrinsicHeight()).toBe(1);
    expect(config.wordWrap).toBe(false);
    expect(config.multiLine).toBe(false);
  });

  it('renders an empty field with spaces by default', () => {
    const {input} = createInput();

    expect(input.textContent).toBe(' '.repeat(20));
  });

  it('renders placeholder text when value is empty', () => {
    const {input} = createInput(undefined, {placeholder: 'Type here...'});

    expect(input.textContent).toContain('Type here...');
  });

  it('renders initial value from attribute', () => {
    const {input} = createInput(undefined, {value: 'hello', width: '10'});

    expect(input.textContent).toContain('hello');
  });

  it('applies custom width to viewport config', () => {
    const {input} = createInput(undefined, {width: '5'});
    const config = (input as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.intrinsicWidth()).toBe(5);
    expect(input.textContent?.length).toBe(5);
  });

  it('reports maxlength through config', () => {
    const {input} = createInput(undefined, {maxlength: '3'});
    const config = (input as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.maxLength?.()).toBe(3);
  });

  it('reports placeholder through config', () => {
    const {input} = createInput(undefined, {placeholder: 'Enter text'});
    const config = (input as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.placeholder?.()).toBe('Enter text');
  });

  it('sets tabindex on connect when not disabled', () => {
    const {input} = createInput();

    expect(input.getAttribute('tabindex')).toBe('0');
  });

  it('does not set tabindex when disabled', () => {
    const {input} = createInput(undefined, {disabled: true});

    expect(input.hasAttribute('tabindex')).toBe(false);
  });

  it('removes tabindex when disabled attribute is added', () => {
    const {input} = createInput();

    expect(input.getAttribute('tabindex')).toBe('0');

    input.setAttribute('disabled', '');

    expect(input.hasAttribute('tabindex')).toBe(false);
  });

  it('restores tabindex when disabled attribute is removed', () => {
    const {input} = createInput(undefined, {disabled: true});

    input.removeAttribute('disabled');

    expect(input.getAttribute('tabindex')).toBe('0');
  });

  it('reports readonly state', () => {
    const {input} = createInput(undefined, {readonly: true});

    expect(input.hasAttribute('readonly')).toBe(true);
  });
});
