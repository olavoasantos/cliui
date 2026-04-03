import {describe, expect, it} from 'vitest';

import {Fieldset} from '../component';
import {Window} from '@cliui/dom';

import type {Element} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Fieldset.tagName, Fieldset);

  return {window, document};
}

describe('Fieldset', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('fieldset')).toBe(Fieldset);
  });

  it('renders as a block container', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    document.body.appendChild(fieldset);

    expect(fieldset.tagName).toBe('FIELDSET');
  });

  it('renders children inside the content wrapper', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    fieldset.textContent = 'Field content';
    document.body.appendChild(fieldset);

    const contentWrapper = fieldset.childNodes[1];

    expect(contentWrapper).toBeDefined();
    expect((contentWrapper as Element).getAttribute('class')).toBe('fieldset-content');
  });

  it('hides legend row when no legend attribute is set', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    document.body.appendChild(fieldset);

    const legendEl = fieldset.childNodes[0] as Element;

    expect(legendEl.getAttribute('class')).toBe('fieldset-legend');
    expect(legendEl.style.display).toBe('none');
  });

  it('shows legend row when legend attribute is set', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    fieldset.setAttribute('legend', 'Personal Info');
    document.body.appendChild(fieldset);

    const legendEl = fieldset.childNodes[0] as Element;

    expect(legendEl.style.display).toBe('block');
    expect(legendEl.textContent).toBe('Personal Info');
  });

  it('updates legend text when attribute changes', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    fieldset.setAttribute('legend', 'Old Title');
    document.body.appendChild(fieldset);

    fieldset.setAttribute('legend', 'New Title');

    const legendEl = fieldset.childNodes[0] as Element;

    expect(legendEl.textContent).toBe('New Title');
  });

  it('hides legend when legend attribute is removed', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    fieldset.setAttribute('legend', 'Title');
    document.body.appendChild(fieldset);

    fieldset.removeAttribute('legend');

    const legendEl = fieldset.childNodes[0] as Element;

    expect(legendEl.style.display).toBe('none');
    expect(legendEl.textContent).toBe('');
  });

  it('preserves child content through internal structure build', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset');
    const child = document.createElement('div');
    child.textContent = 'Input here';
    fieldset.appendChild(child);
    document.body.appendChild(fieldset);

    const contentWrapper = fieldset.childNodes[1] as Element;

    expect(contentWrapper.childNodes.length).toBe(1);
    expect((contentWrapper.childNodes[0] as Element).textContent).toBe('Input here');
  });

  it('disabled property reflects the attribute', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('fieldset') as Fieldset;
    document.body.appendChild(fieldset);

    expect(fieldset.disabled).toBe(false);

    fieldset.disabled = true;

    expect(fieldset.hasAttribute('disabled')).toBe(true);
    expect(fieldset.disabled).toBe(true);
  });
});
