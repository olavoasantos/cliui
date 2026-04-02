import {describe, expect, it} from 'vitest';

import {UiCard} from '../component';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiCard.tagName, UiCard);

  return {window, document};
}

describe('UiCard', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-card')).toBe(UiCard);
  });

  it('shows header when attribute is set', () => {
    const {document} = createEnv();
    const card = document.createElement('ui-card');
    card.setAttribute('header', 'Stats');
    document.body.appendChild(card);

    const headerEl = card.childNodes[0] as Element;

    expect(headerEl.textContent).toBe('Stats');
    expect(headerEl.style.display).toBe('block');
  });

  it('hides header when attribute is absent', () => {
    const {document} = createEnv();
    const card = document.createElement('ui-card');
    document.body.appendChild(card);

    const headerEl = card.childNodes[0] as Element;

    expect(headerEl.style.display).toBe('none');
  });

  it('shows footer when attribute is set', () => {
    const {document} = createEnv();
    const card = document.createElement('ui-card');
    card.setAttribute('footer', 'Updated 5m ago');
    document.body.appendChild(card);

    const footerEl = card.childNodes[2] as Element;

    expect(footerEl.textContent).toBe('Updated 5m ago');
    expect(footerEl.style.display).toBe('block');
  });

  it('preserves child content in the content wrapper', () => {
    const {document} = createEnv();
    const card = document.createElement('ui-card');
    card.setAttribute('header', 'Title');
    const child = document.createElement('div');
    child.textContent = 'Body content';
    card.appendChild(child);
    document.body.appendChild(card);

    const contentWrapper = card.childNodes[1] as Element;

    expect(contentWrapper.getAttribute('class')).toBe('ui-card-content');
    expect(contentWrapper.childNodes.length).toBe(1);
  });
});
