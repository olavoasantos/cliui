import {describe, expect, it} from 'vitest';

import {UiConfirmation} from '../component';
import {Event} from '../../../dom/classes/Event';
import {MouseEvent} from '../../../dom/classes/MouseEvent';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiConfirmation.tagName, UiConfirmation);

  return {window, document};
}

describe('UiConfirmation', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-confirmation')).toBe(UiConfirmation);
  });

  it('creates a dialog element on first confirm call', () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Are you sure?');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog');
    expect(dialog).not.toBeNull();

    dialog!.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });

  it('displays the message attribute in the dialog', () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Delete this file?');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog')!;
    const messageEl = (dialog as unknown as Element).querySelector('.ui-confirmation-message');

    expect(messageEl?.textContent).toBe('Delete this file?');

    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });

  it('resolves true when confirm button is clicked', async () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Proceed?');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog')!;
    const confirmBtn = (dialog as unknown as Element).querySelector('.ui-confirmation-confirm')!;
    confirmBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const result = await promise;

    expect(result).toBe(true);
  });

  it('resolves false when cancel button is clicked', async () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Proceed?');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog')!;
    const cancelBtn = (dialog as unknown as Element).querySelector('.ui-confirmation-cancel')!;
    cancelBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const result = await promise;

    expect(result).toBe(false);
  });

  it('resolves false on Escape (cancel event)', async () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Proceed?');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));

    const result = await promise;

    expect(result).toBe(false);
  });

  it('uses custom button labels', () => {
    const {document} = createEnv();
    const confirmation = document.createElement('ui-confirmation') as UiConfirmation;
    confirmation.setAttribute('message', 'Save?');
    confirmation.setAttribute('confirm-label', 'Yes');
    confirmation.setAttribute('cancel-label', 'No');
    document.body.appendChild(confirmation);

    const promise = confirmation.confirm();

    const dialog = document.body.querySelector('dialog')!;
    const dialogEl = dialog as unknown as Element;
    const confirmBtn = dialogEl.querySelector('.ui-confirmation-confirm')!;
    const cancelBtn = dialogEl.querySelector('.ui-confirmation-cancel')!;

    expect(confirmBtn.textContent).toBe('Yes');
    expect(cancelBtn.textContent).toBe('No');

    dialog.dispatchEvent(new Event('cancel', {bubbles: false}));
    return promise;
  });
});
