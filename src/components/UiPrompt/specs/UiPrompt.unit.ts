import {describe, expect, it} from 'vitest';

import {UiPrompt} from '../component';
import {UiInput} from '../../UiInput/component';
import {Event} from '../../../dom/classes/Event';
import {MouseEvent} from '../../../dom/classes/MouseEvent';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiPrompt.tagName, UiPrompt);
  window.customElements.define(UiInput.tagName, UiInput);

  return {window, document};
}

describe('UiPrompt', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-prompt')).toBe(UiPrompt);
  });

  it('creates a dialog element on first prompt call', () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    document.body.appendChild(prompt);

    const promise = prompt.prompt('Enter name:');

    const dialog = document.body.querySelector('dialog');
    expect(dialog).not.toBeNull();

    dialog!.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });

  it('displays the message in the dialog', () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    document.body.appendChild(prompt);

    const promise = prompt.prompt('What is your name?');

    const dialog = document.body.querySelector('dialog')!;
    const messageEl = (dialog as unknown as Element).querySelector('.ui-prompt-message');

    expect(messageEl?.textContent).toBe('What is your name?');

    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });

  it('resolves with input value when confirm is clicked', async () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    document.body.appendChild(prompt);

    const promise = prompt.prompt('Name:');

    const dialog = document.body.querySelector('dialog')!;
    const dialogEl = dialog as unknown as Element;

    /* Simulate typing by setting the input value */
    const input = dialogEl.querySelector('ui-input')!;
    input.setAttribute('value', 'Alice');

    const confirmBtn = dialogEl.querySelector('.ui-prompt-confirm')!;
    confirmBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const result = await promise;

    expect(result).toBe('Alice');
  });

  it('resolves null when cancel is clicked', async () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    document.body.appendChild(prompt);

    const promise = prompt.prompt('Name:');

    const dialog = document.body.querySelector('dialog')!;
    const cancelBtn = (dialog as unknown as Element).querySelector('.ui-prompt-cancel')!;
    cancelBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const result = await promise;

    expect(result).toBeNull();
  });

  it('resolves null on Escape (cancel event)', async () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    document.body.appendChild(prompt);

    const promise = prompt.prompt('Name:');

    const dialog = document.body.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));

    const result = await promise;

    expect(result).toBeNull();
  });

  it('uses custom button labels', () => {
    const {document} = createEnv();
    const prompt = document.createElement('ui-prompt') as UiPrompt;
    prompt.setAttribute('confirm-label', 'Save');
    prompt.setAttribute('cancel-label', 'Discard');
    document.body.appendChild(prompt);

    const promise = prompt.prompt('Enter value:');

    const dialog = document.body.querySelector('dialog')!;
    const dialogEl = dialog as unknown as Element;
    const confirmBtn = dialogEl.querySelector('.ui-prompt-confirm')!;
    const cancelBtn = dialogEl.querySelector('.ui-prompt-cancel')!;

    expect(confirmBtn.textContent).toBe('Save');
    expect(cancelBtn.textContent).toBe('Discard');

    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });
});
