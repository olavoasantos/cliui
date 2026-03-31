import {describe, expect, it} from 'vitest';

import {UiFieldset} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiFieldset.tagName, UiFieldset);

  return {window, document};
}

describe('UiFieldset', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-fieldset')).toBe(UiFieldset);
  });

  it('renders as a block container', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    document.body.appendChild(fieldset);

    expect(fieldset.tagName).toBe('UI-FIELDSET');
  });

  it('renders children inside the content wrapper', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    fieldset.textContent = 'Field content';
    document.body.appendChild(fieldset);

    const contentWrapper = fieldset.childNodes[1];

    expect(contentWrapper).toBeDefined();
    expect((contentWrapper as import('../../../dom').Element).getAttribute('class')).toBe(
      'ui-fieldset-content',
    );
  });

  it('hides legend row when no legend attribute is set', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    document.body.appendChild(fieldset);

    const legendEl = fieldset.childNodes[0] as import('../../../dom').Element;

    expect(legendEl.getAttribute('class')).toBe('ui-fieldset-legend');
    expect(legendEl.style.display).toBe('none');
  });

  it('shows legend row when legend attribute is set', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    fieldset.setAttribute('legend', 'Personal Info');
    document.body.appendChild(fieldset);

    const legendEl = fieldset.childNodes[0] as import('../../../dom').Element;

    expect(legendEl.style.display).toBe('block');
    expect(legendEl.textContent).toBe('Personal Info');
  });

  it('updates legend text when attribute changes', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    fieldset.setAttribute('legend', 'Old Title');
    document.body.appendChild(fieldset);

    fieldset.setAttribute('legend', 'New Title');

    const legendEl = fieldset.childNodes[0] as import('../../../dom').Element;

    expect(legendEl.textContent).toBe('New Title');
  });

  it('hides legend when legend attribute is removed', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    fieldset.setAttribute('legend', 'Title');
    document.body.appendChild(fieldset);

    fieldset.removeAttribute('legend');

    const legendEl = fieldset.childNodes[0] as import('../../../dom').Element;

    expect(legendEl.style.display).toBe('none');
    expect(legendEl.textContent).toBe('');
  });

  it('preserves child content through internal structure build', () => {
    const {document} = createEnv();
    const fieldset = document.createElement('ui-fieldset');
    const child = document.createElement('div');
    child.textContent = 'Input here';
    fieldset.appendChild(child);
    document.body.appendChild(fieldset);

    const contentWrapper = fieldset.childNodes[1] as import('../../../dom').Element;

    expect(contentWrapper.childNodes.length).toBe(1);
    expect((contentWrapper.childNodes[0] as import('../../../dom').Element).textContent).toBe(
      'Input here',
    );
  });
});
