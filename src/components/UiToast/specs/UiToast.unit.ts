import {describe, expect, it} from 'vitest';

import {UiToast} from '../component';
import {DEFAULT_UI_TOAST_DURATION} from '../constants';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiToast.tagName, UiToast);

  return {window, document};
}

describe('UiToast', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-toast')).toBe(UiToast);
  });

  it('defaults to info variant', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;

    expect(toast.getVariant()).toBe('info');
  });

  it('reads variant from attribute', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;
    toast.setAttribute('variant', 'error');

    expect(toast.getVariant()).toBe('error');
  });

  it('returns default duration when not set', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;

    expect(toast.getDuration()).toBe(DEFAULT_UI_TOAST_DURATION);
  });

  it('reads duration from attribute', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;
    toast.setAttribute('duration', '5000');

    expect(toast.getDuration()).toBe(5000);
  });

  it('records start timestamp on first frame tick', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;
    document.body.appendChild(toast);

    toast.onTerminalFrame(1000);

    /* Toast should still be in the DOM after first tick */
    expect(document.body.childNodes).toContain(toast);
  });

  it('removes itself after duration elapses', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;
    toast.setAttribute('duration', '2000');
    document.body.appendChild(toast);

    toast.onTerminalFrame(1000);
    toast.onTerminalFrame(2999);

    /* Still present before duration */
    expect(document.body.childNodes).toContain(toast);

    toast.onTerminalFrame(3000);

    /* Removed after duration */
    expect(document.body.childNodes).not.toContain(toast);
  });

  it('does not remove when elapsed time is less than duration', () => {
    const {document} = createEnv();
    const toast = document.createElement('ui-toast') as UiToast;
    toast.setAttribute('duration', '5000');
    document.body.appendChild(toast);

    toast.onTerminalFrame(0);
    toast.onTerminalFrame(4999);

    expect(document.body.childNodes).toContain(toast);
  });
});
