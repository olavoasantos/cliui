import {describe, expect, it} from 'vitest';

import {UiAlert} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiAlert.tagName, UiAlert);

  return {window, document};
}

describe('UiAlert', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-alert')).toBe(UiAlert);
  });

  it('defaults to info variant', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-alert') as UiAlert;
    document.body.appendChild(alert);

    expect(alert.getVariant()).toBe('info');
  });

  it('reads variant from attribute', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-alert') as UiAlert;
    alert.setAttribute('variant', 'error');
    document.body.appendChild(alert);

    expect(alert.getVariant()).toBe('error');
  });

  it('renders icon prefix matching the variant', () => {
    const {document} = createEnv();

    for (const [variant, icon] of [
      ['info', 'ℹ'],
      ['success', '✓'],
      ['warning', '⚠'],
      ['error', '✗'],
    ] as const) {
      const alert = document.createElement('ui-alert');
      alert.setAttribute('variant', variant);
      alert.textContent = 'Test message';
      document.body.appendChild(alert);

      // The icon element is the first child of the internal row
      const row = alert.childNodes[0] as import('../../../dom').Element;
      const iconEl = row?.childNodes[0] as import('../../../dom').Element;

      expect(iconEl?.textContent).toBe(icon);
    }
  });

  it('updates icon when variant changes', () => {
    const {document} = createEnv();
    const alert = document.createElement('ui-alert') as UiAlert;
    alert.setAttribute('variant', 'info');
    alert.textContent = 'Message';
    document.body.appendChild(alert);

    const row = alert.childNodes[0] as import('../../../dom').Element;
    const iconEl = row?.childNodes[0] as import('../../../dom').Element;

    expect(iconEl?.textContent).toBe('ℹ');

    alert.setAttribute('variant', 'error');

    expect(iconEl?.textContent).toBe('✗');
  });
});
