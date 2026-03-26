import {describe, expect, it, vi} from 'vitest';

import {HOOKS, NAME, NS, NamespaceURI} from '../../constants';
import {Element} from '../../classes/Element';
import {Window} from '../../classes/Window';
import {setupElement} from '../setupElement';

describe('setupElement', () => {
  it('associates the element with the owner document', () => {
    const window = new Window();
    const element = new Element();

    setupElement(element, window.document, 'div');

    expect(element.ownerDocument).toBe(window.document);
  });

  it('sets the NAME property on the element', () => {
    const window = new Window();
    const element = new Element();

    setupElement(element, window.document, 'article');

    expect(element[NAME]).toBe('article');
  });

  it('sets the NS property when a namespace is provided', () => {
    const window = new Window();
    const element = new Element();

    setupElement(element, window.document, 'svg', NamespaceURI.SVG);

    expect(element[NS]).toBe(NamespaceURI.SVG);
  });

  it('does not set the NS property when no namespace is given', () => {
    const window = new Window();
    const element = new Element();

    setupElement(element, window.document, 'div');

    expect(element[NS]).toBe(NamespaceURI.XHTML);
  });

  it('calls the createElement hook if it exists', () => {
    const window = new Window();
    const createElementHook = vi.fn();
    window[HOOKS] = {createElement: createElementHook};
    const element = new Element();

    setupElement(element, window.document, 'div', NamespaceURI.XHTML);

    expect(createElementHook).toHaveBeenCalledWith(element, NamespaceURI.XHTML);
  });

  it('returns the same element instance', () => {
    const window = new Window();
    const element = new Element();

    expect(setupElement(element, window.document, 'div')).toBe(element);
  });
});
