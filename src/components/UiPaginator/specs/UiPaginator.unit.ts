import {describe, expect, it, vi} from 'vitest';

import {UiPaginator} from '../component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiPaginator.tagName, UiPaginator);

  return {window, document};
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

  it('truncates large page counts with ellipsis', () => {
    const {document} = createEnv();
    const pag = document.createElement('ui-paginator') as UiPaginator;
    pag.setAttribute('page', '10');
    pag.setAttribute('total-pages', '20');
    document.body.appendChild(pag);

    /* ‹ 1 … 9 10 11 … 20 › = 9 children */
    expect(pag.childNodes.length).toBe(9);

    const texts: string[] = [];

    for (let i = 0; i < pag.childNodes.length; i++) {
      texts.push((pag.childNodes[i] as import('../../../dom').Element).textContent ?? '');
    }

    expect(texts).toEqual(['‹', '1', '…', '9', '10', '11', '…', '20', '›']);
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
