import {describe, expect, it, vi} from 'vitest';

import {Form} from '../component';
import {UiInput} from '../../UiInput/component';
import {KeyboardEvent} from '@cliui/dom';
import {MouseEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Form.tagName, Form);
  window.customElements.define(UiInput.tagName, UiInput);

  return {window, document};
}

describe('Form', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('form')).toBe(Form);
  });

  it('renders as a block container', () => {
    const {document} = createEnv();
    const form = document.createElement('form');
    document.body.appendChild(form);

    expect(form.tagName).toBe('FORM');
  });

  it('dispatches submit when a submit button is clicked', () => {
    const {document} = createEnv();
    const form = document.createElement('form');
    const button = document.createElement('button');
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
    const form = document.createElement('form');
    const button = document.createElement('button');
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
    const form = document.createElement('form');
    const input = document.createElement('ui-input');
    form.appendChild(input);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not dispatch submit when disabled', () => {
    const {document} = createEnv();
    const form = document.createElement('form') as Form;
    form.setAttribute('disabled', '');
    const button = document.createElement('button');
    button.setAttribute('type', 'submit');
    form.appendChild(button);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(handler).not.toHaveBeenCalled();
  });

  it('resets child input values and dispatches reset event', () => {
    const {document} = createEnv();
    const form = document.createElement('form') as Form;
    const input = document.createElement('input');
    input.setAttribute('value', 'hello');
    form.appendChild(input);
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('reset', handler);

    form.reset();

    expect(input.getAttribute('value')).toBe('');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('submit() dispatches a submit event', () => {
    const {document} = createEnv();
    const form = document.createElement('form') as Form;
    document.body.appendChild(form);

    const handler = vi.fn();
    form.addEventListener('submit', handler);

    form.submit();

    expect(handler).toHaveBeenCalledOnce();
  });

  it('elements getter returns form controls', () => {
    const {document} = createEnv();
    const form = document.createElement('form') as Form;
    const input = document.createElement('input');
    const button = document.createElement('button');
    form.appendChild(input);
    form.appendChild(button);
    document.body.appendChild(form);

    const controls = form.elements;

    expect(controls.length).toBe(2);
  });

  it('reports disabled state correctly', () => {
    const {document} = createEnv();
    const form = document.createElement('form') as Form;
    document.body.appendChild(form);

    expect(form.isDisabled()).toBe(false);

    form.setAttribute('disabled', '');

    expect(form.isDisabled()).toBe(true);
  });
});
