import {describe, expect, it, vi} from 'vitest';

import {UiPaginator} from '../component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiPaginator.tagName, UiPaginator);

  return {window, document};
}

function collectTexts(pag: UiPaginator): string[] {
  const texts: string[] = [];

  for (let i = 0; i < pag.childNodes.length; i++) {
    texts.push((pag.childNodes[i] as Element).textContent ?? '');
  }

  return texts;
}

describe('UiPaginator', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-paginator')).toBe(UiPaginator);
  });

  it('renders page controls', () => {
    const {document} = createEnv();
    const pag = document.createElement('ui-paginator') as UiPaginator;
    pag.setAttribute('page', '2');
    pag.setAttribute('total-pages', '5');
    document.body.appendChild(pag);

    /* ‹ 1 2 3 4 5 › = 7 children */
    expect(pag.childNodes.length).toBe(7);
  });

  it('truncates large page counts with fixed-width layout', () => {
    const {document} = createEnv();

    /* Near start: page 1 */
    const pag1 = document.createElement('ui-paginator') as UiPaginator;
    pag1.setAttribute('page', '1');
    pag1.setAttribute('total-pages', '20');
    document.body.appendChild(pag1);
    let texts = collectTexts(pag1);
    expect(texts).toEqual(['‹', '1', '2', '3', '4', '5', '…', '20', '›']);

    /* Middle: page 10 */
    const pag2 = document.createElement('ui-paginator') as UiPaginator;
    pag2.setAttribute('page', '10');
    pag2.setAttribute('total-pages', '20');
    document.body.appendChild(pag2);
    texts = collectTexts(pag2);
    expect(texts).toEqual(['‹', '1', '…', '9', '10', '11', '…', '20', '›']);

    /* Near end: page 20 */
    const pag3 = document.createElement('ui-paginator') as UiPaginator;
    pag3.setAttribute('page', '20');
    pag3.setAttribute('total-pages', '20');
    document.body.appendChild(pag3);
    texts = collectTexts(pag3);
    expect(texts).toEqual(['‹', '1', '…', '16', '17', '18', '19', '20', '›']);
  });

  it('advances page on ArrowRight', () => {
    const {document} = createEnv();
    const pag = document.createElement('ui-paginator') as UiPaginator;
    pag.setAttribute('page', '1');
    pag.setAttribute('total-pages', '3');
    document.body.appendChild(pag);

    const handler = vi.fn();
    pag.addEventListener('change', handler);

    pag.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(pag.getPage()).toBe(2);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('goes back on ArrowLeft', () => {
    const {document} = createEnv();
    const pag = document.createElement('ui-paginator') as UiPaginator;
    pag.setAttribute('page', '3');
    pag.setAttribute('total-pages', '5');
    document.body.appendChild(pag);

    pag.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));

    expect(pag.getPage()).toBe(2);
  });

  it('clamps to bounds', () => {
    const {document} = createEnv();
    const pag = document.createElement('ui-paginator') as UiPaginator;
    pag.setAttribute('page', '1');
    pag.setAttribute('total-pages', '3');
    document.body.appendChild(pag);

    pag.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));

    expect(pag.getPage()).toBe(1);
  });
});
