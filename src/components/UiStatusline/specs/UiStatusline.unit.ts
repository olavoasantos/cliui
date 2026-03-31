import {describe, expect, it} from 'vitest';

import {UiStatusline} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiStatusline.tagName, UiStatusline);

  return {window, document};
}

describe('UiStatusline', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-statusline')).toBe(UiStatusline);
  });

  it('renders children in the status bar', () => {
    const {document} = createEnv();
    const bar = document.createElement('ui-statusline');
    const left = document.createElement('span');
    left.textContent = 'Mode: Normal';
    const right = document.createElement('span');
    right.textContent = 'Ln 42, Col 8';
    bar.appendChild(left);
    bar.appendChild(right);
    document.body.appendChild(bar);

    expect(bar.childNodes.length).toBe(2);
    expect(bar.tagName).toBe('UI-STATUSLINE');
  });
});
