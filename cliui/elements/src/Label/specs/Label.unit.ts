import {describe, expect, it} from 'vitest';

import {Label} from '../component';
import {MouseEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Label.tagName, Label);

  return {window, document};
}

describe('Label', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('label')).toBe(Label);
  });

  it('renders text content', () => {
    const {document} = createEnv();
    const label = document.createElement('label');
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

    const label = document.createElement('label');
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

    const label = document.createElement('label');
    label.setAttribute('for', 'name-input');
    label.setAttribute('disabled', '');
    label.textContent = 'Name:';
    document.body.appendChild(label);

    label.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(document.activeElement).toBe(document.body);
  });

  it('returns null from getTarget when no for attribute', () => {
    const {document} = createEnv();
    const label = document.createElement('label') as Label;
    document.body.appendChild(label);

    expect(label.getTarget()).toBeNull();
  });

  it('htmlFor property reflects the for attribute', () => {
    const {document} = createEnv();
    const label = document.createElement('label') as Label;
    document.body.appendChild(label);

    expect(label.htmlFor).toBe('');

    label.htmlFor = 'name-input';

    expect(label.getAttribute('for')).toBe('name-input');
    expect(label.htmlFor).toBe('name-input');
  });
});
