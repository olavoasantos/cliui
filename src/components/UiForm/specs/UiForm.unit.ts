import {describe, expect, it, vi} from 'vitest';

import {UiForm} from '../component';
import {UiButton} from '../../UiButton/component';
import {UiInput} from '../../UiInput/component';
import {KeyboardEvent} from '@cliui/dom';
import {MouseEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiForm.tagName, UiForm);
  window.customElements.define(UiButton.tagName, UiButton);
  window.customElements.define(UiInput.tagName, UiInput);

  return {window, document};
}

describe('UiForm', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-form')).toBe(UiForm);
  });

  it('renders as a block container', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form');
    document.body.appendChild(form);

    expect(form.tagName).toBe('UI-FORM');
  });

  it('dispatches submit when a submit button is clicked', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form');
    const button = document.createElement('ui-button');
    button.setAttribute('type', 'submit');
    button.textContent = 'Submit';
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not dispatch submit for non-submit buttons', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form');
    const button = document.createElement('ui-button');
    button.textContent = 'Cancel';
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches submit on Enter in a single-line input', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form');
    const input = document.createElement('ui-input');
    form.appendChild(input);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not dispatch submit on non-Enter keys', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form');
    const input = document.createElement('ui-input');
    form.appendChild(input);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not dispatch submit when disabled', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form') as UiForm;
    form.setAttribute('disabled', '');
    const button = document.createElement('ui-button');
    button.setAttribute('type', 'submit');
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it('resets child input values', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form') as UiForm;
    const input = document.createElement('ui-input');
    input.setAttribute('value', 'hello');
    form.appendChild(input);
    document.body.appendChild(form);

    form.reset();

    expect(input.getAttribute('value')).toBe('');
  });

  it('resets child textarea values', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form') as UiForm;
    const textarea = document.createElement('ui-textarea');
    textarea.setAttribute('value', 'some text');
    form.appendChild(textarea);
    document.body.appendChild(form);

    form.reset();

    expect(textarea.getAttribute('value')).toBe('');
  });

  it('reports disabled state correctly', () => {
    const {document} = createEnv();
    const form = document.createElement('ui-form') as UiForm;
    document.body.appendChild(form);

    expect(form.isDisabled()).toBe(false);

    form.setAttribute('disabled', '');

    expect(form.isDisabled()).toBe(true);
  });
});
