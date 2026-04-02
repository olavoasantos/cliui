import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {UiOption} from '../component';

import type {CustomElementConstructor} from '@cliui/dom';

function createOption(
  window = new Window(),
  attributes: Record<string, string> = {},
  text = '',
): {window: Window; option: UiOption} {
  window.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);
  const option = window.document.createElement('ui-option') as UiOption;

  for (const [name, value] of Object.entries(attributes)) {
    option.setAttribute(name, value);
  }

  if (text) option.textContent = text;

  window.document.body.appendChild(option);

  return {window, option};
}

describe('UiOption', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-option')).toBe(
      UiOption as unknown as CustomElementConstructor,
    );
  });

  it('returns value from attribute', () => {
    const {option} = createOption(undefined, {value: 'foo'}, 'Foo Label');

    expect(option.getValue()).toBe('foo');
  });

  it('falls back to textContent when no value attribute', () => {
    const {option} = createOption(undefined, {}, 'Bar Label');

    expect(option.getValue()).toBe('Bar Label');
  });

  it('returns label from textContent', () => {
    const {option} = createOption(undefined, {value: 'x'}, 'My Label');

    expect(option.getLabel()).toBe('My Label');
  });

  it('falls back to value for label when no textContent', () => {
    const {option} = createOption(undefined, {value: 'fallback'});

    expect(option.getLabel()).toBe('fallback');
  });

  it('reports selected state', () => {
    const {option} = createOption(undefined, {selected: ''});

    expect(option.isSelected()).toBe(true);
  });

  it('reports not selected by default', () => {
    const {option} = createOption();

    expect(option.isSelected()).toBe(false);
  });

  it('reports disabled state', () => {
    const {option} = createOption(undefined, {disabled: ''});

    expect(option.isDisabled()).toBe(true);
  });
});
