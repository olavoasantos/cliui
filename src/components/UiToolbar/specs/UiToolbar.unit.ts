import {describe, expect, it} from 'vitest';

import {UiToolbar} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiToolbar.tagName, UiToolbar);

  return {window, document};
}

describe('UiToolbar', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-toolbar')).toBe(UiToolbar);
  });

  it('renders children horizontally', () => {
    const {document} = createEnv();
    const toolbar = document.createElement('ui-toolbar');
    const btn1 = document.createElement('div');
    btn1.textContent = 'Save';
    const btn2 = document.createElement('div');
    btn2.textContent = 'Load';
    toolbar.appendChild(btn1);
    toolbar.appendChild(btn2);
    document.body.appendChild(toolbar);

    expect(toolbar.childNodes.length).toBe(2);
    expect(toolbar.tagName).toBe('UI-TOOLBAR');
  });
});
