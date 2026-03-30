import {describe, expect, it} from 'vitest';

import {UiLabel} from '../component';
import {MouseEvent} from '../../../dom/classes/MouseEvent';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiLabel.tagName, UiLabel);

  return {window, document};
}

describe('UiLabel', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-label')).toBe(UiLabel);
  });

  it('renders text content', () => {
    const {document} = createEnv();
    const label = document.createElement('ui-label');
    label.textContent = 'Name:';
    document.body.appendChild(label);

    expect(label.textContent).toBe('Name:');
  });

  it('forwards click to the element matching the for attribute', () => {
    const {document} = createEnv();
    const input = document.createElement('div');
    input.setAttribute('id', 'name-input');
    input.setAttribute('tabindex', '0');
    document.body.appendChild(input);

    const label = document.createElement('ui-label');
    label.setAttribute('for', 'name-input');
    label.textContent = 'Name:';
    document.body.appendChild(label);

    label.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(document.activeElement).toBe(input);
  });

  it('does not forward click when disabled', () => {
    const {document} = createEnv();
    const input = document.createElement('div');
    input.setAttribute('id', 'name-input');
    input.setAttribute('tabindex', '0');
    document.body.appendChild(input);

    const label = document.createElement('ui-label');
    label.setAttribute('for', 'name-input');
    label.setAttribute('disabled', '');
    label.textContent = 'Name:';
    document.body.appendChild(label);

    label.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(document.activeElement).toBe(document.body);
  });

  it('returns null from getTarget when no for attribute', () => {
    const {document} = createEnv();
    const label = document.createElement('ui-label') as UiLabel;
    document.body.appendChild(label);

    expect(label.getTarget()).toBeNull();
  });
});
