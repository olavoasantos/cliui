import {describe, expect, it} from 'vitest';

import {Toolbar} from '../component';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Toolbar.tagName, Toolbar);

  return {window, document};
}

describe('Toolbar', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('toolbar')).toBe(Toolbar);
  });

  it('renders children horizontally', () => {
    const {document} = createEnv();
    const toolbar = document.createElement('toolbar');
    const btn1 = document.createElement('div');
    btn1.textContent = 'Save';
    const btn2 = document.createElement('div');
    btn2.textContent = 'Load';
    toolbar.appendChild(btn1);
    toolbar.appendChild(btn2);
    document.body.appendChild(toolbar);

    expect(toolbar.childNodes.length).toBe(2);
    expect(toolbar.tagName).toBe('TOOLBAR');
  });
});
