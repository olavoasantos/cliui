import {describe, expect, it} from 'vitest';

import {UiMessage} from '../component';
import {Window} from '@cliui/dom';

import type {Element} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiMessage.tagName, UiMessage);

  return {window, document};
}

describe('UiMessage', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-message')).toBe(UiMessage);
  });

  it('defaults to info tone', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-message') as UiMessage;
    document.body.appendChild(alert);

    expect(alert.getTone()).toBe('info');
  });

  it('reads tone from attribute', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-message') as UiMessage;
    alert.setAttribute('tone', 'error');
    document.body.appendChild(alert);

    expect(alert.getTone()).toBe('error');
  });

  it('renders icon prefix matching the tone', () => {
    const {document} = createEnv();

    for (const [tone, icon] of [
      ['info', 'ℹ'],
      ['success', '✓'],
      ['warning', '⚠'],
      ['error', '✗'],
    ] as const) {
      const alert = document.createElement('ui-message');
      alert.setAttribute('tone', tone);
      alert.textContent = 'Test message';
      document.body.appendChild(alert);

      // The icon element is the first child of the internal row
      const row = alert.childNodes[0] as Element;
      const iconEl = row?.childNodes[0] as Element;

      expect(iconEl?.textContent).toBe(icon);
    }
  });

  it('updates icon when tone changes', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-message') as UiMessage;
    alert.setAttribute('tone', 'info');
    alert.textContent = 'Message';
    document.body.appendChild(alert);

    const row = alert.childNodes[0] as Element;
    const iconEl = row?.childNodes[0] as Element;

    expect(iconEl?.textContent).toBe('ℹ');

    alert.setAttribute('tone', 'error');

    expect(iconEl?.textContent).toBe('✗');
  });
});
