import {describe, expect, it} from 'vitest';

import {Statusline} from '../component';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Statusline.tagName, Statusline);

  return {window, document};
}

describe('Statusline', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('statusline')).toBe(Statusline);
  });

  it('renders children in the status bar', () => {
    const {document} = createEnv();
    const bar = document.createElement('statusline');
    const left = document.createElement('span');
    left.textContent = 'Mode: Normal';
    const right = document.createElement('span');
    right.textContent = 'Ln 42, Col 8';
    bar.appendChild(left);
    bar.appendChild(right);
    document.body.appendChild(bar);

    expect(bar.childNodes.length).toBe(2);
    expect(bar.tagName).toBe('STATUSLINE');
  });
});
