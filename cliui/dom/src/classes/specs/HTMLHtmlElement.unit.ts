import {describe, expect, it} from 'vitest';

import {Element} from '../Element';
import {HTMLHtmlElement} from '../HTMLHtmlElement';
import {Window} from '../Window';

describe('HTMLHtmlElement', () => {
  it('is created as the document element', () => {
    const document = new Window().document;

    expect(document.documentElement).toBeInstanceOf(HTMLHtmlElement);
  });

  it('is an instance of Element', () => {
    const document = new Window().document;

    expect(document.documentElement).toBeInstanceOf(Element);
  });

  it('has localName html', () => {
    const document = new Window().document;

    expect(document.documentElement.localName).toBe('html');
  });
});
